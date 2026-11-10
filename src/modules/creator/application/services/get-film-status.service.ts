import { Injectable } from '@nestjs/common';

import { FilmRepository } from '../../../film/domain/repositories/film.repository';
import { FilmNotFoundException } from '../../../film/domain/exceptions/film-not-found.exception';
import { FilmStatus } from '../../../film/domain/enums/film-status.enum';
import { MediaAssetRepository } from '../../../media/domain/repositories/media-asset.repository';
import { ProcessingJobRepository } from '../../../processing/domain/repositories/processing-job.repository';
import { ProcessingStatus } from '../../../processing/domain/enums/processing-status.enum';
import { ProcessingStep } from '../../../processing/domain/enums/processing-step.enum';

const STEP_PROGRESS: Record<ProcessingStep, number> = {
  [ProcessingStep.VALIDATION]: 5,
  [ProcessingStep.METADATA_EXTRACTION]: 15,
  [ProcessingStep.THUMBNAIL_GENERATION]: 30,
  [ProcessingStep.TRANSCODING]: 50,
  [ProcessingStep.HLS_GENERATION]: 75,
  [ProcessingStep.FINALIZATION]: 95,
};

@Injectable()
export class GetFilmStatusService {
  constructor(
    private readonly filmRepository: FilmRepository,
    private readonly mediaAssetRepository: MediaAssetRepository,
    private readonly processingJobRepository: ProcessingJobRepository,
  ) {}

  async execute(filmId: string) {
    const film = await this.filmRepository.findById(filmId);
    if (!film) {
      throw new FilmNotFoundException(filmId);
    }

    const mediaAsset =
      await this.mediaAssetRepository.findLatestByFilmId(filmId);
    const job = mediaAsset
      ? await this.processingJobRepository.findByMediaAssetId(mediaAsset.id)
      : null;

    let progress = 0;
    if (
      film.status === FilmStatus.READY ||
      film.status === FilmStatus.PUBLISHED ||
      job?.status === ProcessingStatus.COMPLETED
    ) {
      progress = 100;
    } else if (job?.currentStep) {
      progress = STEP_PROGRESS[job.currentStep];
    }

    return {
      filmId: film.id,
      filmStatus: film.status,
      processingStatus: job?.status ?? null,
      processingStep: job?.currentStep ?? null,
      progress,
      lastUpdatedAt: job?.updatedAt ?? mediaAsset?.updatedAt ?? film.updatedAt,
    };
  }
}
