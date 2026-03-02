import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import type { Ctx } from '@/common/types/context';

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

export async function truncateAllTables(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES_TO_TRUNCATE.join(', ')} RESTART IDENTITY CASCADE`,
  );
}

export function createTestContext(overrides?: Partial<Ctx>): Ctx {
  return {
    source: 'HTTP',
    requestId: `test-${randomUUID()}`,
    timestamp: new Date(),
    ...overrides,
  };
}
