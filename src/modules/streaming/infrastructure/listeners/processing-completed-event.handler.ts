import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { StructuredLogger } from '../../../../infrastructure/observability/structured-logger.service';
import { ProcessingJobCompletedEvent } from '../../../processing/domain/events/processing-job-completed.event';
import { RegisterStreamingAssetService } from '../../application/services/register-streaming-asset.service';

@Injectable()
export class ProcessingCompletedEventHandler {
  constructor(
    private readonly registerStreamingAsset: RegisterStreamingAssetService,
    private readonly logger: StructuredLogger,
  ) {}

  @OnEvent('processing.job.completed')
  async handle(event: ProcessingJobCompletedEvent): Promise<void> {
    try {
      await this.registerStreamingAsset.execute(event.aggregateId);
    } catch (error) {
      this.logger.error(
        'Failed to register streaming assets.',
        error,
        { processingJobId: event.aggregateId },
      );
      throw error;
    }
  }
}
