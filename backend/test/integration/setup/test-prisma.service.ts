import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const TEST_DATABASE_URL =
  'postgresql://ticketshub:ticketshub@localhost:5433/ticketshubtest';

let prismaInstance: PrismaClient | null = null;
let poolInstance: Pool | null = null;

export async function getTestPrismaClient(): Promise<PrismaClient> {
  if (prismaInstance) {
    return prismaInstance;
  }

  poolInstance = new Pool({ connectionString: TEST_DATABASE_URL });
  const adapter = new PrismaPg(poolInstance);
  prismaInstance = new PrismaClient({ adapter });

  await prismaInstance.$connect();

  return prismaInstance;
}

export async function disconnectTestPrisma(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}
