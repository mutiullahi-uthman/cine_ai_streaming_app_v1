import { ConflictException } from '@nestjs/common';

export class InvalidFilmStateException
  extends ConflictException
{
  constructor(message: string) {
    super(message);
  }
}