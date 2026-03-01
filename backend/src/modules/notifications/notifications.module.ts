import { Module, Global, forwardRef } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsAdminController } from './admin/notifications-admin.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { NOTIFICATIONS_REPOSITORY } from './notifications.repository.interface';
import { NotificationsWorker } from './notifications.worker';
import { NotificationsScheduler } from './notifications.scheduler';
import { NotificationsSeeder } from './notifications.seeds';
import { ProcessorRegistry, ALL_PROCESSORS } from './processors';
import { ALL_CHANNELS } from './channels';
import { ALL_TEMPLATE_SERVICES } from './templates';
import { UsersModule } from '../users/users.module';

@Global()
@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [NotificationsController, NotificationsAdminController],
  providers: [
    NotificationsService,
    {
      provide: NOTIFICATIONS_REPOSITORY,
      useClass: NotificationsRepository,
    },
    NotificationsWorker,
    NotificationsScheduler,
    NotificationsSeeder,
    ProcessorRegistry,
    ...ALL_PROCESSORS,
    ...ALL_CHANNELS,
    ...ALL_TEMPLATE_SERVICES,
  ],
  exports: [NotificationsService, ProcessorRegistry],
})
export class NotificationsModule {}
