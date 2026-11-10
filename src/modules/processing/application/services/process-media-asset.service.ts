import {
  Inject,
  Injectable,
} from '@nestjs/common';

import {
  VIDEO_PROCESSING_GATEWAY,
} from '../../../../infrastructure/ffmpeg';
import type { VideoProcessingGateway } from '../../../../infrastructure/ffmpeg';
import { OBJECT_KEY_FACTORY } from '../../../../infrastructure/storage';
import type { ObjectKeyFactory } from '../../../../infrastructure/storage/contracts/object-key-factory.interface';
import { MediaAssetRepository } from '../../../media/domain/repositories/media-asset.repository';
import { MediaStatus } from '../../../media/domain/enums/media-status.enum';
import { ProcessingJob } from '../../domain/entities/processing-job.entity';
import { ProcessingStatus } from '../../domain/enums/processing-status.enum';
import { ProcessingStep } from '../../domain/enums/processing-step.enum';
import { ProcessingJobRepository } from '../../domain/repositories/processing-job.repository';
import { MetricsService } from '../../../../infrastructure/observability/metrics.service';
import { StructuredLogger } from '../../../../infrastructure/observability/structured-logger.service';

@Injectable()
export class ProcessMediaAssetService {
  private static readonly MAX_ATTEMPTS = 4;

  constructor(
    private readonly jobRepository: ProcessingJobRepository,
    private readonly mediaAssetRepository: MediaAssetRepository,
    @Inject(VIDEO_PROCESSING_GATEWAY)
    private readonly videoGateway: VideoProcessingGateway,
    @Inject(OBJECT_KEY_FACTORY)
    private readonly objectKeys: ObjectKeyFactory,
    private readonly metrics: MetricsService,
    private readonly logger: StructuredLogger,
  ) {}

  async execute(jobId: string): Promise<void> {
    let job = await this.jobRepository.findById(jobId);
    if (!job || job.status !== ProcessingStatus.PENDING) {
      return;
    }

    const asset = await this.mediaAssetRepository.findById(
      job.mediaAssetId,
    );
    if (!asset) {
      throw new Error(`Media asset ${job.mediaAssetId} was not found.`);
    }

    job.start();
    await this.jobRepository.save(job);
    const processingStartedAt = Date.now();
    const logContext = {
      processingJobId: job.id,
      mediaAssetId: asset.id,
      filmId: asset.filmId,
    };

    try {
      if (asset.status === MediaStatus.READY) {
        job.complete();
        await this.jobRepository.save(job);
        return;
      }

      if (asset.status === MediaStatus.FAILED) {
        throw new Error(`Media asset ${asset.id} has failed.`);
      }

      asset.markProcessing();
      await this.mediaAssetRepository.save(asset);

      await this.runStep(
        job,
        ProcessingStep.VALIDATION,
        async () => {
          if (asset.sizeBytes <= 0n || !asset.objectKey) {
            throw new Error('Uploaded media failed validation.');
          }
        },
        logContext,
      );

      let metadata: Awaited<
        ReturnType<VideoProcessingGateway['extractMetadata']>
      > | undefined;
      await this.runStep(
        job,
        ProcessingStep.METADATA_EXTRACTION,
        async () => {
          metadata = await this.videoGateway.extractMetadata(asset.objectKey);
          if (
            metadata.width <= 0 ||
            metadata.height <= 0 ||
            !Number.isFinite(metadata.durationSeconds) ||
            metadata.durationSeconds <= 0
          ) {
            throw new Error('Video dimensions are invalid.');
          }
          asset.setDurationSeconds(metadata.durationSeconds);
          await this.mediaAssetRepository.save(asset);
        },
        logContext,
      );

      await this.runStep(
        job,
        ProcessingStep.THUMBNAIL_GENERATION,
        () =>
          this.videoGateway.generateThumbnail(
            asset.objectKey,
            this.objectKeys.createPosterKey(asset.filmId),
          ),
        logContext,
      );

      await this.runStep(
        job,
        ProcessingStep.TRANSCODING,
        () =>
          this.videoGateway.generatePreview(
            asset.objectKey,
            this.objectKeys.createPreviewVideoKey(asset.filmId),
          ),
        logContext,
      );

      await this.runStep(
        job,
        ProcessingStep.HLS_GENERATION,
        () =>
          this.videoGateway.generateHlsRenditions(
            asset.objectKey,
            this.objectKeys
              .createMasterPlaylistKey(asset.filmId)
              .replace(/\/master\.m3u8$/, ''),
          ),
        logContext,
      );

      await this.runStep(
        job,
        ProcessingStep.FINALIZATION,
        async () => {
          asset.markReady();
          await this.mediaAssetRepository.save(asset);
          job.complete();
          await this.jobRepository.save(job);
        },
        logContext,
      );
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : String(error);
      this.logger.error(
        'Processing attempt failed.',
        error,
        { ...logContext, attempt: job.attempts, errorMessage: message },
      );

      const persistedJob = await this.jobRepository.findById(job.id);
      if (
        persistedJob &&
        persistedJob.status === ProcessingStatus.PROCESSING
      ) {
        const statusAfterFailure = persistedJob.fail(
          message,
          ProcessMediaAssetService.MAX_ATTEMPTS,
        );
        await this.jobRepository.save(persistedJob);

        if (statusAfterFailure === ProcessingStatus.FAILED) {
          const persistedAsset = await this.mediaAssetRepository.findById(
            persistedJob.mediaAssetId,
          );
          if (
            persistedAsset &&
            persistedAsset.status !== MediaStatus.READY &&
            persistedAsset.status !== MediaStatus.FAILED
          ) {
            persistedAsset.fail();
            await this.mediaAssetRepository.save(persistedAsset);
          }
        }
      }
    } finally {
      this.metrics.observe(
        'processing_duration_seconds',
        (Date.now() - processingStartedAt) / 1000,
      );
      await this.videoGateway.releaseSource(asset.objectKey);
    }
  }

  private async runStep(
    job: ProcessingJob,
    step: ProcessingStep,
    operation: () => Promise<void>,
    context: {
      processingJobId: string;
      mediaAssetId: string;
      filmId: string;
    },
  ): Promise<void> {
    job.beginStep(step);
    await this.jobRepository.save(job);

    let heartbeatWrite = Promise.resolve();
    const stepStartedAt = Date.now();
    const timer = setInterval(() => {
      heartbeatWrite = heartbeatWrite.then(async () => {
        job.heartbeat();
        await this.jobRepository.save(job);
      });
    }, 60_000);

    try {
      await operation();
      this.logger.info('Processing step completed.', {
        ...context,
        step,
      });
    } finally {
      clearInterval(timer);
      try {
        await heartbeatWrite;
      } finally {
        if (step === ProcessingStep.HLS_GENERATION) {
          this.metrics.observe(
            'hls_generation_duration_seconds',
            (Date.now() - stepStartedAt) / 1000,
          );
        }
      }
    }
  }
}