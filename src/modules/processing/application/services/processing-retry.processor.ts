import {
  Injectable,
} from '@nestjs/common';

import { MediaAssetRepository } from '../../../media/domain/repositories/media-asset.repository';
import { MediaStatus } from '../../../media/domain/enums/media-status.enum';
import { ProcessingStatus } from '../../domain/enums/processing-status.enum';
import { ProcessingJobRepository } from '../../domain/repositories/processing-job.repository';
import { StructuredLogger } from '../../../../infrastructure/observability/structured-logger.service';
import { ProcessingQueue } from '../../../../infrastructure/queue/queues/processing.queue';

@Injectable()
export class ProcessingRetryProcessor {
  private isRetrying = false;
  private isRecovering = false;

  constructor(
    private readonly jobRepository: ProcessingJobRepository,
    private readonly mediaAssetRepository: MediaAssetRepository,
    private readonly processingQueue: ProcessingQueue,
    private readonly logger: StructuredLogger,
  ) {}

  async retryPending(): Promise<void> {
    if (this.isRetrying) {
      return;
    }
    this.isRetrying = true;

    try {
      const jobs = await this.jobRepository.findPending(20);
      let failedToEnqueue = 0;
      for (const job of jobs) {
        try {
          await this.processingQueue.enqueue(job.id, job.attempts + 1);
        } catch (error) {
          failedToEnqueue += 1;
          this.logger.error('Failed to enqueue pending processing job.', error, {
            processingJobId: job.id,
            mediaAssetId: job.mediaAssetId,
          });
        }
      }
      if (failedToEnqueue > 0) {
        throw new Error(`Failed to enqueue ${failedToEnqueue} pending processing jobs.`);
      }
    } catch (error) {
      this.logger.error('Pending processing job scan failed.', error);
      throw error;
    } finally {
      this.isRetrying = false;
    }
  }

  async recoverStuckProcessingJobs(): Promise<void> {
    if (this.isRecovering) {
      return;
    }
    this.isRecovering = true;

    try {
      const staleJobs = await this.jobRepository.findStaleProcessing(
        new Date(Date.now() - 30 * 60 * 1000),
        20,
      );
      let recoveryFailures = 0;
      for (const staleJob of staleJobs) {
        try {
          const asset = await this.mediaAssetRepository.findById(
            staleJob.mediaAssetId,
          );
          staleJob.fail(
            `Processing interrupted at ${staleJob.currentStep ?? 'startup'}; retrying after recovery.`,
            4,
          );
          await this.jobRepository.save(staleJob);
          if (
            staleJob.status === ProcessingStatus.FAILED &&
            asset &&
            asset.status !== MediaStatus.READY &&
            asset.status !== MediaStatus.FAILED
          ) {
            asset.fail();
            await this.mediaAssetRepository.save(asset);
          }

          this.logger.warn('Recovered a stuck processing job.', {
            processingJobId: staleJob.id,
            mediaAssetId: staleJob.mediaAssetId,
            filmId: asset?.filmId,
            step: staleJob.currentStep,
            attempts: staleJob.attempts,
            status: staleJob.status,
          });
        } catch (error) {
          recoveryFailures += 1;
          this.logger.error('Failed to recover stuck processing job.', error, {
            processingJobId: staleJob.id,
            mediaAssetId: staleJob.mediaAssetId,
          });
        }
      }
      if (recoveryFailures > 0) {
        throw new Error(`Failed to recover ${recoveryFailures} stuck processing jobs.`);
      }
    } catch (error) {
      this.logger.error('Stuck processing job recovery failed.', error);
      throw error;
    } finally {
      this.isRecovering = false;
    }
  }
}