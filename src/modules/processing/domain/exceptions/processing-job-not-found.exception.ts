import { NotFoundException } from '@nestjs/common';

export class ProcessingJobNotFoundException extends NotFoundException {
  constructor(jobId: string) {
    super(`Processing job ${jobId} was not found.`);
  }
}