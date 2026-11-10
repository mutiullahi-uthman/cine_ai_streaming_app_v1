import { ConflictException } from '@nestjs/common';

export class InvalidProcessingStateException extends ConflictException {
  constructor(jobId: string, message: string) {
    super(`Processing job ${jobId}: ${message}`);
  }
}