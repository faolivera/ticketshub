import { execSync } from 'child_process';
import { Pool } from 'pg';

const TEST_DATABASE = 'ticketshubtest';
const ADMIN_DATABASE_URL =
  'postgresql://ticketshub:ticketshub@localhost:5433/postgres';
const TEST_DATABASE_URL = `postgresql://ticketshub:ticketshub@localhost:5433/${TEST_DATABASE}`;

/**
 * E2E global setup: ensure test database exists and migrations are applied.
 * Uses the same test DB as integration tests so e2e can run against known state
 * after seeding (done in jest-setup or beforeAll).
 */
export default async function globalSetup(): Promise<void> {
  console.log('\n🔧 E2E Test Global Setup\n');

  const adminPool = new Pool({ connectionString: ADMIN_DATABASE_URL });

  try {
    const res = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [TEST_DATABASE],
    );
    if (res.rows.length === 0) {
      console.log(`  Creating database "${TEST_DATABASE}"...`);
      await adminPool.query(`CREATE DATABASE ${TEST_DATABASE}`);
    } else {
      console.log(`  Database "${TEST_DATABASE}" already exists.`);
    }
  } finally {
    await adminPool.end();
  }

  console.log('  Running Prisma migrations...');
  execSync('npx prisma migrate deploy', {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
    },
    stdio: 'inherit',
  });

  console.log('\n✅ E2E global setup complete.\n');
}
