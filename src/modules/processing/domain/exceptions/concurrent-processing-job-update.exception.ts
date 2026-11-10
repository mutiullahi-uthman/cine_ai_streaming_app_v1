import { ConflictException } from '@nestjs/common';

export class ConcurrentProcessingJobUpdateException extends ConflictException {
  constructor(jobId: string) {
    super(`Processing job ${jobId} was modified by another operation.`);
  }
}