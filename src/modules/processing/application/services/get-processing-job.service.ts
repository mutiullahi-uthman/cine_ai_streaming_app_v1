import { Injectable } from '@nestjs/common';

import { ProcessingJobNotFoundException } from '../../domain/exceptions/processing-job-not-found.exception';
import { ProcessingJobRepository } from '../../domain/repositories/processing-job.repository';

@Injectable()
export class GetProcessingJobService {
  constructor(
    private readonly jobRepository: ProcessingJobRepository,
  ) {}

  async execute(jobId: string) {
    const job = await this.jobRepository.findById(jobId);
    if (!job) {
      throw new ProcessingJobNotFoundException(jobId);
    }

    return {
      id: job.id,
      mediaAssetId: job.mediaAssetId,
      status: job.status,
      currentStep: job.currentStep,
      attempts: job.attempts,
      errorMessage: job.errorMessage,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      version: job.getVersion(),
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}