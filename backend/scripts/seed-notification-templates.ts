/**
 * Sync notification templates with default content (e.g. after changing bodyTemplate to use {{amountFormatted}}).
 * Updates existing templates; creates any that are missing.
 *
 * Run from backend dir: npx ts-node -r tsconfig-paths/register scripts/seed-notification-templates.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { NotificationsSeeder } from '../src/modules/notifications/notifications.seeds';
import { ON_APP_INIT_CTX } from '../src/common/types/context';

async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const seeder = app.get(NotificationsSeeder);
    const result = await seeder.syncTemplates(ON_APP_INIT_CTX);
    console.log(
      `Notification templates synced: ${result.updated} updated, ${result.created} created.`,
    );
  } finally {
    await app.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
