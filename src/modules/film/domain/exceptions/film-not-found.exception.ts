import { NotFoundException } from '@nestjs/common';

export class FilmNotFoundException
  extends NotFoundException
{
  constructor(filmId: string) {
    super(`Film ${filmId} was not found.`);
  }
}