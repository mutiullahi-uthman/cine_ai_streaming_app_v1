import { ConflictException } from '@nestjs/common';

export class InvalidMediaStateException extends ConflictException {
  constructor(mediaId: string, message: string) {
    super(`Media asset ${mediaId}: ${message}`);
  }
}