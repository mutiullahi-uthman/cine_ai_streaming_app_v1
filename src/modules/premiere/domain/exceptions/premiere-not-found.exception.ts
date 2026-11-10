import { NotFoundException } from '@nestjs/common';

export class PremiereNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Premiere ${id} was not found.`);
  }
}
