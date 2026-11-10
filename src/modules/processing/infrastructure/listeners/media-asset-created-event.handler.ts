import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { MediaAssetCreatedEvent } from '../../../media/domain/events/media-asset-created.event';
import { ProcessingStatus } from '../../domain/enums/processing-status.enum';
import { ProcessingJob } from '../../domain/entities/processing-job.entity';
import { ProcessingJobRepository } from '../../domain/repositories/processing-job.repository';
import { ProcessingQueue } from '../../../../infrastructure/queue/queues/processing.queue';

@Injectable()
export class MediaAssetCreatedEventHandler {
  constructor(
    private readonly jobRepository: ProcessingJobRepository,
    private readonly processingQueue: ProcessingQueue,
  ) {}

  @OnEvent('media.asset.created')
  async handle(event: MediaAssetCreatedEvent): Promise<void> {
    let job = await this.jobRepository.findByMediaAssetId(
      event.aggregateId,
    );

    if (!job) {
      job = ProcessingJob.create(event.aggregateId);
      await this.jobRepository.save(job);
    }

    if (job.status === ProcessingStatus.PENDING) {
      await this.processingQueue.enqueue(job.id, job.attempts + 1);
    }
  }
}