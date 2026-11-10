import assert from 'node:assert/strict';
import test from 'node:test';

import { Film } from '../film/domain/entities/film.entity';
import { FilmRepository } from '../film/domain/repositories/film.repository';
import { MediaAssetRepository } from '../media/domain/repositories/media-asset.repository';
import { ProcessingJobRepository } from '../processing/domain/repositories/processing-job.repository';
import { ProcessingJob } from '../processing/domain/entities/processing-job.entity';
import { ProcessingStep } from '../processing/domain/enums/processing-step.enum';
import { MediaAsset } from '../media/domain/entities/media-asset.entity';
import { GetFilmStatusService } from './application/services/get-film-status.service';

test('creator status reports progress for the current processing step', async () => {
  const film = Film.create({
    creatorId: 'creator-1',
    title: 'Film',
    synopsis: 'A feature film',
  });
  const asset = MediaAsset.create({
    filmId: film.id,
    objectKey: 'film/source.mp4',
    etag: 'etag',
    sizeBytes: 100n,
    contentType: 'video/mp4',
  });
  const job = ProcessingJob.create(asset.id);
  job.start();
  job.beginStep(ProcessingStep.HLS_GENERATION);

  class Films extends FilmRepository {
    async save(): Promise<void> {}
    async findById(): Promise<Film | null> { return film; }
    async findAll(): Promise<Film[]> { return [film]; }
  }
  class Assets extends MediaAssetRepository {
    async save(): Promise<void> {}
    async findById(): Promise<MediaAsset | null> { return asset; }
    async findByObjectKey(): Promise<MediaAsset | null> { return asset; }
    async findLatestByFilmId(): Promise<MediaAsset | null> { return asset; }
  }
  class Jobs extends ProcessingJobRepository {
    async save(): Promise<void> {}
    async findById(): Promise<ProcessingJob | null> { return job; }
    async findByMediaAssetId(): Promise<ProcessingJob | null> { return job; }
    async findPending(): Promise<ProcessingJob[]> { return []; }
    async findStaleProcessing(): Promise<ProcessingJob[]> { return []; }
  }

  const result = await new GetFilmStatusService(
    new Films(),
    new Assets(),
    new Jobs(),
  ).execute(film.id);

  assert.equal(result.processingStep, ProcessingStep.HLS_GENERATION);
  assert.equal(result.progress, 75);
});
