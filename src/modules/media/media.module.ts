import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { FilmModule } from '../film/film.module';
import { MediaAssetRepository } from './domain/repositories/media-asset.repository';
import { PrismaMediaAssetRepository } from './infrastructure/persistence/prisma-media-asset.repository';
import { UploadCompletedEventHandler } from './infrastructure/listeners/upload-completed-event.handler';
import { MediaFailedEventHandler } from './infrastructure/listeners/media-failed-event.handler';

@Module({
  imports: [PrismaModule, FilmModule],
  providers: [
    UploadCompletedEventHandler,
    MediaFailedEventHandler,
    {
      provide: MediaAssetRepository,
      useClass: PrismaMediaAssetRepository,
    },
  ],
  exports: [MediaAssetRepository],
})
export class MediaModule {}