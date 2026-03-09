import { execSync } from 'child_process';
import { Pool } from 'pg';

const TEST_DATABASE = 'ticketshubtest';
const ADMIN_DATABASE_URL =
  'postgresql://ticketshub:ticketshub@localhost:5433/postgres';
const TEST_DATABASE_URL = `postgresql://ticketshub:ticketshub@localhost:5433/${TEST_DATABASE}`;

export default async function globalSetup(): Promise<void> {
  console.log('\n🔧 Integration Test Global Setup\n');

  const adminPool = new Pool({ connectionString: ADMIN_DATABASE_URL });

  try {
    // Drop the test database if it exists
    console.log(`  Dropping database "${TEST_DATABASE}" if exists...`);
    await adminPool.query(`DROP DATABASE IF EXISTS ${TEST_DATABASE}`);

    // Create the test database
    console.log(`  Creating database "${TEST_DATABASE}"...`);
    await adminPool.query(`CREATE DATABASE ${TEST_DATABASE}`);

    console.log('  Database created successfully.');
  } finally {
    await adminPool.end();
  }

  // Run Prisma migrations against the test database
  console.log('  Running Prisma migrations...');
  execSync('npx prisma migrate deploy', {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
    },
    stdio: 'inherit',
  });

  console.log('\n✅ Global setup complete.\n');
}
