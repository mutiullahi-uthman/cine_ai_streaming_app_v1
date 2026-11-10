import { ConflictException } from '@nestjs/common';

export class ConcurrentFilmUpdateException
  extends ConflictException
{
  constructor(filmId: string) {
    super(`Film ${filmId} was modified by another operation.`);
  }
}