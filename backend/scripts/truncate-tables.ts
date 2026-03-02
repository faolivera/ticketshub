import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TABLES_TO_TRUNCATE = [
  'scheduler_locks',
  'notifications',
  'notification_events',
  'notification_templates',
  'notification_channel_configs',
  'support_messages',
  'support_tickets',
  'identity_verification_requests',
  'user_terms_states',
  'user_terms_acceptances',
  'terms_versions',
  'reviews',
  'otps',
  'wallet_transactions',
  'wallets',
  'pricing_snapshots',
  'payment_confirmations',
  'payment_intents',
  'payment_methods',
  'transactions',
  'ticket_units',
  'ticket_listings',
  'event_sections',
  'event_dates',
  'events',
  'images',
  'users',
];

async function truncateAllTables(): Promise<void> {
  console.log('=== Truncating All Tables ===\n');

  try {
    // Disable foreign key checks and truncate all tables in a single transaction
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE ${TABLES_TO_TRUNCATE.join(', ')} RESTART IDENTITY CASCADE
    `);

    console.log(`Truncated ${TABLES_TO_TRUNCATE.length} tables:`);
    for (const table of TABLES_TO_TRUNCATE) {
      console.log(`  - ${table}`);
    }

    console.log('\n=== Truncation Complete ===');
  } catch (error) {
    console.error('Error truncating tables:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

truncateAllTables();
