import { Module } from '@nestjs/common';

import { StorageModule } from '../storage/storage.module';
import { FfmpegVideoProcessingGateway } from './ffmpeg-video-processing.gateway';
import { VIDEO_PROCESSING_GATEWAY } from './video-processing.constants';

@Module({
  imports: [StorageModule],
  providers: [
    FfmpegVideoProcessingGateway,
    {
      provide: VIDEO_PROCESSING_GATEWAY,
      useExisting: FfmpegVideoProcessingGateway,
    },
  ],
  exports: [VIDEO_PROCESSING_GATEWAY],
})
export class FfmpegModule {}