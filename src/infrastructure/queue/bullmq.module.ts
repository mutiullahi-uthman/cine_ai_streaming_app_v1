import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';

import { getBullRedisOptions } from '../cache/redis-connection';
import {
  CLEANUP_QUEUE,
  DEAD_LETTER_QUEUE,
  NOTIFICATION_QUEUE,
  PROCESSING_QUEUE,
} from './queues/queue.constants';
import { CleanupQueue } from './queues/cleanup.queue';
import { DeadLetterQueue } from './queues/dead-letter.queue';
import { NotificationQueue } from './queues/notification.queue';
import { ProcessingQueue } from './queues/processing.queue';

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: getBullRedisOptions(),
    }),
    BullModule.registerQueue(
      { name: PROCESSING_QUEUE },
      { name: NOTIFICATION_QUEUE },
      { name: CLEANUP_QUEUE },
      { name: DEAD_LETTER_QUEUE },
    ),
  ],
  providers: [
    ProcessingQueue,
    NotificationQueue,
    CleanupQueue,
    DeadLetterQueue,
  ],
  exports: [
    BullModule,
    ProcessingQueue,
    NotificationQueue,
    CleanupQueue,
    DeadLetterQueue,
  ],
})
export class BullMqModule {}
