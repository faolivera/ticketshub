import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { Gauge, Histogram, register } from 'prom-client';
import { ContextLogger } from '../logger/context-logger';
import { ON_APP_INIT_CTX } from '../types/context';
import {
  METRIC_DB_QUERY_DURATION,
  METRIC_PG_POOL_CONNECTIONS_IDLE,
  METRIC_PG_POOL_CONNECTIONS_TOTAL,
  METRIC_PG_POOL_CONNECTIONS_WAITING,
} from '../metrics/metrics.constants';

/** Buckets in ms: fast indexed queries to slow 2.5s outliers. */
const DB_QUERY_DURATION_BUCKETS_MS = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500];

type PrismaServiceClientOptions = Prisma.PrismaClientOptions & {
  log: [{ emit: 'event'; level: 'query' }];
};

@Injectable()
export class PrismaService
  extends PrismaClient<PrismaServiceClientOptions>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new ContextLogger(PrismaService.name);
  private readonly pool: Pool;
  private readonly queryDuration: Histogram;

  constructor(private readonly configService: ConfigService) {
    const connectionString = configService.get<string>('database.url');
    if (!connectionString) {
      throw new Error(
        'database.url is required. Set DATABASE_URL or configure in HOCON.',
      );
    }
    const pool = new Pool({ connectionString, min: 2 });
    const adapter = new PrismaPg(pool);
    super({ adapter, log: [{ emit: 'event', level: 'query' }] });
    this.pool = pool;

    this.queryDuration = this.registerHistogram();
    this.registerPoolGauges();
  }

  async onModuleInit(): Promise<void> {
    this.$on('query', (e: Prisma.QueryEvent) => {
      this.logger.debug(ON_APP_INIT_CTX, 'db query', {
        duration: e.duration,
        target: e.target,
        query: e.query,
      });
      this.queryDuration.observe(e.duration);
    });
    await this.$connect();
    await this.$queryRaw`SELECT 1`;
    this.logger.debug(ON_APP_INIT_CTX, 'onModuleInit', { message: 'db pool warmed up' });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  private registerHistogram(): Histogram {
    try {
      return new Histogram({
        name: METRIC_DB_QUERY_DURATION,
        help: 'Prisma query duration in milliseconds',
        buckets: DB_QUERY_DURATION_BUCKETS_MS,
      });
    } catch {
      // Already registered (e.g. across hot reloads or test runs); reuse from registry.
      return register.getSingleMetric(METRIC_DB_QUERY_DURATION) as Histogram;
    }
  }

  private registerPoolGauges(): void {
    const pool = this.pool;

    const tryRegisterGauge = (
      name: string,
      help: string,
      getValue: () => number,
    ): void => {
      try {
        new Gauge({ name, help, collect() { this.set(getValue()); } });
      } catch {
        // Already registered; prom-client will use the existing registration.
      }
    };

    tryRegisterGauge(
      METRIC_PG_POOL_CONNECTIONS_TOTAL,
      'Total connections in the pg connection pool (active + idle)',
      () => pool.totalCount,
    );
    tryRegisterGauge(
      METRIC_PG_POOL_CONNECTIONS_IDLE,
      'Idle connections in the pg connection pool',
      () => pool.idleCount,
    );
    tryRegisterGauge(
      METRIC_PG_POOL_CONNECTIONS_WAITING,
      'Clients waiting for a connection from the pg pool',
      () => pool.waitingCount,
    );
  }
}
