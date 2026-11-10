import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';

import { FilmRepository } from '../../../film/domain/repositories/film.repository';
import { FilmNotFoundException } from '../../../film/domain/exceptions/film-not-found.exception';
import { FilmStatus } from '../../../film/domain/enums/film-status.enum';
import { Premiere } from '../../domain/entities/premiere.entity';
import { PremiereStatus } from '../../domain/enums/premiere-status.enum';
import { PremiereRepository } from '../../domain/repositories/premiere.repository';
import { PremiereView, toPremiereView } from '../contracts/premiere-view';

@Injectable()
export class SchedulePremiereService {
  constructor(
    private readonly filmRepository: FilmRepository,
    private readonly premiereRepository: PremiereRepository,
  ) {}

  async execute(filmId: string, startsAt: Date): Promise<PremiereView> {
    if (!Number.isFinite(startsAt.getTime()) || startsAt <= new Date()) {
      throw new BadRequestException(
        'Premiere start time must be in the future.',
      );
    }

    const film = await this.filmRepository.findById(filmId);
    if (!film) {
      throw new FilmNotFoundException(filmId);
    }
    if (film.status !== FilmStatus.READY) {
      throw new ConflictException(
        'A premiere can only be scheduled for a film in READY status.',
      );
    }

    const existing = await this.premiereRepository.findByFilmId(filmId);
    if (existing) {
      if (existing.status !== PremiereStatus.CANCELLED) {
        throw new ConflictException(
          'This film already has a premiere that is not cancelled.',
        );
      }
      existing.reschedule(startsAt);
      await this.premiereRepository.save(existing);
      return toPremiereView(existing);
    }

    const premiere = Premiere.schedule({ filmId, startsAt });
    try {
      await this.premiereRepository.save(premiere);
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This film already has a premiere scheduled.',
        );
      }
      throw error;
    }
    return toPremiereView(premiere);
  }
}
