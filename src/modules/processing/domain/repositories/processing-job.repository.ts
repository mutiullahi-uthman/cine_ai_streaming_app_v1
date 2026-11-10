import { ProcessingJob } from '../entities/processing-job.entity';

export abstract class ProcessingJobRepository {
  abstract save(job: ProcessingJob): Promise<void>;
  abstract findById(id: string): Promise<ProcessingJob | null>;
  abstract findByMediaAssetId(mediaAssetId: string): Promise<ProcessingJob | null>;
  abstract findPending(limit: number): Promise<ProcessingJob[]>;
  abstract findStaleProcessing(
    staleBefore: Date,
    limit: number,
  ): Promise<ProcessingJob[]>;
}