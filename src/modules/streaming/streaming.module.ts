import { Module } from '@nestjs/common';

import { CdnModule } from '../../infrastructure/cdn/cdn.module';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { FilmModule } from '../film/film.module';
import { MediaModule } from '../media/media.module';
import { ProcessingModule } from '../processing/processing.module';
import { PremiereModule } from '../premiere/premiere.module';
import { GetPlaybackService } from './application/services/get-playback.service';
import { RegisterStreamingAssetService } from './application/services/register-streaming-asset.service';
import { StreamingController } from './api/streaming.controller';
import { StreamingAssetRepository } from './domain/repositories/streaming-asset.repository';
import { ProcessingCompletedEventHandler } from './infrastructure/listeners/processing-completed-event.handler';
import { StreamingAssetReadyEventHandler } from './infrastructure/listeners/streaming-asset-ready-event.handler';
import { PrismaStreamingAssetRepository } from './infrastructure/persistence/prisma-streaming-asset.repository';

@Module({
  imports: [
    CdnModule,
    FilmModule,
    MediaModule,
    PrismaModule,
    ProcessingModule,
    PremiereModule,
    StorageModule,
  ],
  controllers: [StreamingController],
  providers: [
    GetPlaybackService,
    RegisterStreamingAssetService,
    ProcessingCompletedEventHandler,
    StreamingAssetReadyEventHandler,
    {
      provide: StreamingAssetRepository,
      useClass: PrismaStreamingAssetRepository,
    },
  ],
  exports: [StreamingAssetRepository],
})
export class StreamingModule {}
