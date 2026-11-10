import { Module } from '@nestjs/common';

import { FilmModule } from '../film/film.module';
import { IdentityModule } from '../identity/identity.module';
import { MediaModule } from '../media/media.module';
import { ProcessingModule } from '../processing/processing.module';
import { CreatorController } from './api/creator.controller';
import { GetFilmStatusService } from './application/services/get-film-status.service';

@Module({
  imports: [FilmModule, IdentityModule, MediaModule, ProcessingModule],
  controllers: [CreatorController],
  providers: [GetFilmStatusService],
})
export class CreatorModule {}
