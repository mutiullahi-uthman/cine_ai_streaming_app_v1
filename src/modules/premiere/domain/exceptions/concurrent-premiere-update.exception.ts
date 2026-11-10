import { ConflictException } from '@nestjs/common';

export class ConcurrentPremiereUpdateException extends ConflictException {
  constructor(id: string) {
    super(`Premiere ${id} was changed by another request.`);
  }
}
