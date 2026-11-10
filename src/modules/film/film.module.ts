// film.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';

import { FilmController } from './api/film.controller';

import { CreateFilmService } from './application/services/create-film.service';
import { FailFilmService } from './application/services/fail-film.service';
import { GetFilmService } from './application/services/get-film.service';
import { ListFilmsService } from './application/services/list-films.service';
import { PublishFilmService } from './application/services/publish-film.service';

import { FilmRepository } from './domain/repositories/film.repository';

import { PrismaFilmRepository } from './infrastructure/persistence/prisma-film.repository';

@Module({
  imports: [PrismaModule],
  controllers: [FilmController],

  providers: [
    CreateFilmService,
    FailFilmService,
    GetFilmService,
    ListFilmsService,
    PublishFilmService,

    {
      provide: FilmRepository,
      useClass: PrismaFilmRepository,
    },
  ],

  exports: [FilmRepository],
})
export class FilmModule {}