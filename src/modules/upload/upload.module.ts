import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { FilmModule } from '../film/film.module';

import { UploadController } from './api/upload.controller';
import { AbortUploadSessionService } from './application/services/abort-upload-session.service';
import { CompleteUploadSessionService } from './application/services/complete-upload-session.service';
import { CreateUploadSessionService } from './application/services/create-upload-session.service';
import { GetUploadSessionService } from './application/services/get-upload-session.service';
import { ListFilmUploadsService } from './application/services/list-film-uploads.service';
import { UploadExpirationProcessor } from './application/services/upload-expiration.processor';
import { UploadSessionRepository } from './domain/repositories/upload-session.repository';
import { PrismaUploadSessionRepository } from './infrastructure/persistence/prisma-upload-session.repository';
import { UploadCompletedEventHandler } from './infrastructure/listeners/upload-completed-event.handler';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    FilmModule,
  ],
  controllers: [UploadController],
  providers: [
    CreateUploadSessionService,
    CompleteUploadSessionService,
    AbortUploadSessionService,
    GetUploadSessionService,
    ListFilmUploadsService,
    UploadExpirationProcessor,
    UploadCompletedEventHandler,
    {
      provide: UploadSessionRepository,
      useClass: PrismaUploadSessionRepository,
    },
  ],
  exports: [
    UploadSessionRepository,
    UploadExpirationProcessor,
  ],
})
export class UploadModule {}
