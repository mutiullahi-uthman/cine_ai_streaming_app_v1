import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { FfmpegModule } from '../../infrastructure/ffmpeg/ffmpeg.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { MediaModule } from '../media/media.module';
import { ProcessingJobRepository } from './domain/repositories/processing-job.repository';
import { ProcessMediaAssetService } from './application/services/process-media-asset.service';
import { MediaAssetCreatedEventHandler } from './infrastructure/listeners/media-asset-created-event.handler';
import { PrismaProcessingJobRepository } from './infrastructure/persistence/prisma-processing-job.repository';
import { ProcessingController } from './api/processing.controller';
import { GetProcessingJobService } from './application/services/get-processing-job.service';
import { BullMqModule } from '../../infrastructure/queue/bullmq.module';
import { ProcessingRetryProcessor } from './application/services/processing-retry.processor';

@Module({
  imports: [PrismaModule, FfmpegModule, StorageModule, MediaModule, BullMqModule],
  controllers: [ProcessingController],
  providers: [
    ProcessMediaAssetService,
    ProcessingRetryProcessor,
    GetProcessingJobService,
    MediaAssetCreatedEventHandler,
    {
      provide: ProcessingJobRepository,
      useClass: PrismaProcessingJobRepository,
    },
  ],
  exports: [
    ProcessingJobRepository,
    ProcessMediaAssetService,
    ProcessingRetryProcessor,
  ],
})
export class ProcessingModule {}