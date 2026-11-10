import { randomUUID } from 'crypto';

import { AggregateRoot } from '../../../../shared/events';
import { InvalidProcessingStateException } from '../exceptions/invalid-processing-state.exception';
import { ProcessingStatus } from '../enums/processing-status.enum';
import { ProcessingStep } from '../enums/processing-step.enum';
import {
  ProcessingJobCompletedEvent,
  ProcessingJobCreatedEvent,
  ProcessingJobFailedEvent,
  ProcessingJobRetryScheduledEvent,
  ProcessingJobStartedEvent,
  ProcessingStepStartedEvent,
} from '../events';

interface RehydrateProcessingJobProps {
  id: string;
  mediaAssetId: string;
  status: ProcessingStatus;
  currentStep: ProcessingStep | null;
  attempts: number;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ProcessingJob extends AggregateRoot {
  private constructor(
    public readonly id: string,
    public readonly mediaAssetId: string,
    public status: ProcessingStatus,
    public currentStep: ProcessingStep | null,
    public attempts: number,
    public errorMessage: string | null,
    public startedAt: Date | null,
    public completedAt: Date | null,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {
    super();
  }

  static create(mediaAssetId: string): ProcessingJob {
    const now = new Date();
    const job = new ProcessingJob(
      randomUUID(),
      mediaAssetId,
      ProcessingStatus.PENDING,
      null,
      0,
      null,
      null,
      null,
      now,
      now,
    );

    job.record(
      (version) =>
        new ProcessingJobCreatedEvent(
          job.id,
          version,
          job.mediaAssetId,
        ),
    );
    return job;
  }

  static rehydrate(props: RehydrateProcessingJobProps): ProcessingJob {
    const job = new ProcessingJob(
      props.id,
      props.mediaAssetId,
      props.status,
      props.currentStep,
      props.attempts,
      props.errorMessage,
      props.startedAt,
      props.completedAt,
      props.createdAt,
      props.updatedAt,
    );
    job.restoreVersion(props.version);
    return job;
  }

  start(): void {
    if (this.status !== ProcessingStatus.PENDING) {
      throw new InvalidProcessingStateException(
        this.id,
        `cannot start from ${this.status}.`,
      );
    }

    this.status = ProcessingStatus.PROCESSING;
    this.attempts += 1;
    this.errorMessage = null;
    this.startedAt = new Date();
    this.completedAt = null;
    this.touch();
    this.record(
      (version) => new ProcessingJobStartedEvent(this.id, version),
    );
  }

  beginStep(step: ProcessingStep): void {
    if (this.status !== ProcessingStatus.PROCESSING) {
      throw new InvalidProcessingStateException(
        this.id,
        'cannot begin a step when the job is not processing.',
      );
    }

    this.currentStep = step;
    this.touch();
    this.record(
      (version) =>
        new ProcessingStepStartedEvent(this.id, version, step),
    );
  }

  heartbeat(): void {
    if (this.status === ProcessingStatus.PROCESSING) {
      this.touch();
      this.advanceVersion();
    }
  }

  complete(): void {
    if (this.status !== ProcessingStatus.PROCESSING) {
      throw new InvalidProcessingStateException(
        this.id,
        'cannot complete a job that is not processing.',
      );
    }

    this.status = ProcessingStatus.COMPLETED;
    this.completedAt = new Date();
    this.errorMessage = null;
    this.touch();
    this.record(
      (version) => new ProcessingJobCompletedEvent(this.id, version),
    );
  }

  fail(
    errorMessage: string,
    maxAttempts: number,
  ): ProcessingStatus {
    if (this.status !== ProcessingStatus.PROCESSING) {
      throw new InvalidProcessingStateException(
        this.id,
        'cannot fail a job that is not processing.',
      );
    }

    this.errorMessage = errorMessage.slice(0, 4000);
    this.status = this.attempts >= maxAttempts
      ? ProcessingStatus.FAILED
      : ProcessingStatus.PENDING;
    this.completedAt = this.status === ProcessingStatus.FAILED
      ? new Date()
      : null;
    this.touch();

    this.record((version) =>
      this.status === ProcessingStatus.FAILED
        ? new ProcessingJobFailedEvent(
            this.id,
            version,
            this.errorMessage ?? 'Unknown processing error',
            this.attempts,
          )
        : new ProcessingJobRetryScheduledEvent(
            this.id,
            version,
            this.errorMessage ?? 'Unknown processing error',
            this.attempts,
          ),
    );

    return this.status;
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}