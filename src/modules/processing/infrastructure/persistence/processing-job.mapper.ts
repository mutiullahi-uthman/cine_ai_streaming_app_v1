import {
  ProcessingJob as PrismaProcessingJob,
  ProcessingStatus as PrismaProcessingStatus,
  ProcessingStep as PrismaProcessingStep,
} from '@prisma/client';

import { ProcessingJob } from '../../domain/entities/processing-job.entity';
import { ProcessingStatus } from '../../domain/enums/processing-status.enum';
import { ProcessingStep } from '../../domain/enums/processing-step.enum';

export class ProcessingJobMapper {
  static toDomain(raw: PrismaProcessingJob): ProcessingJob {
    return ProcessingJob.rehydrate({
      id: raw.id,
      mediaAssetId: raw.mediaAssetId,
      status: raw.status as ProcessingStatus,
      currentStep: raw.currentStep as ProcessingStep | null,
      attempts: raw.attempts,
      errorMessage: raw.errorMessage,
      startedAt: raw.startedAt,
      completedAt: raw.completedAt,
      version: raw.version,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(job: ProcessingJob): PrismaProcessingJob {
    return {
      id: job.id,
      mediaAssetId: job.mediaAssetId,
      status: job.status as unknown as PrismaProcessingStatus,
      currentStep: job.currentStep as unknown as PrismaProcessingStep | null,
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