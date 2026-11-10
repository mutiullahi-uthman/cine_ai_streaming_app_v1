import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { FilmRepository } from '../../../film/domain/repositories/film.repository';
import { FilmStatus } from '../../../film/domain/enums/film-status.enum';
import { PremiereStatus } from '../../domain/enums/premiere-status.enum';
import { PremiereRepository } from '../../domain/repositories/premiere.repository';
import { StructuredLogger } from '../../../../infrastructure/observability/structured-logger.service';

@Injectable()
export class PremiereLifecycleProcessor {
  private isStarting = false;

  constructor(
    private readonly premiereRepository: PremiereRepository,
    private readonly filmRepository: FilmRepository,
    private readonly logger: StructuredLogger,
  ) {}

  @Cron('*/10 * * * * *')
  async startDuePremieres(): Promise<void> {
    if (this.isStarting) {
      return;
    }
    this.isStarting = true;

    try {
      const premieres =
        await this.premiereRepository.findScheduledStartingBefore(
          new Date(),
          100,
        );
      for (const premiere of premieres) {
        try {
          const film = await this.filmRepository.findById(premiere.filmId);
          if (
            !film ||
            (
              film.status !== FilmStatus.READY &&
              film.status !== FilmStatus.PUBLISHED
            )
          ) {
            premiere.cancel();
            await this.premiereRepository.save(premiere);
            this.logger.warn(
              'Cancelled a premiere because its film is no longer ready.',
              {
                premiereId: premiere.id,
                filmId: premiere.filmId,
                filmStatus: film?.status,
              },
            );
            continue;
          }

          premiere.goLive();
          await this.premiereRepository.save(premiere);
        } catch (error) {
          this.logger.error('Failed to start a scheduled premiere.', error, {
            premiereId: premiere.id,
            filmId: premiere.filmId,
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to load scheduled premieres.', error);
    } finally {
      this.isStarting = false;
    }
  }
}
