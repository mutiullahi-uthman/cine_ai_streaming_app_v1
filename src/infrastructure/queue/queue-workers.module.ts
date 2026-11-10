import { Module } from '@nestjs/common';

import { BullMqModule } from './bullmq.module';
import { ProcessingModule } from '../../modules/processing/processing.module';
import { NotificationModule } from '../../modules/notification/notification.module';
import { UploadModule } from '../../modules/upload/upload.module';
import { CleanupWorker } from './workers/cleanup.worker';
import { NotificationWorker } from './workers/notification.worker';
import { ProcessingWorker } from './workers/processing.worker';

@Module({
  imports: [
    BullMqModule,
    ProcessingModule,
    NotificationModule,
    UploadModule,
  ],
  providers: [
    ProcessingWorker,
    NotificationWorker,
    CleanupWorker,
  ],
})
export class QueueWorkersModule {}
