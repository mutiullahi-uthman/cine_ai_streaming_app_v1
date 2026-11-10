import { Injectable } from '@nestjs/common';

import { Film } from '../../domain/entities/film.entity';
import { FilmRepository } from '../../domain/repositories/film.repository';

@Injectable()
export class ListFilmsService {
  constructor(
    private readonly filmRepository: FilmRepository,
  ) {}

  execute(): Promise<Film[]> {
    return this.filmRepository.findAll();
  }
}