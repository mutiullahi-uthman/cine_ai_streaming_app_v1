import {
  ConflictException,
  Injectable,
} from '@nestjs/common';

import { FilmRepository } from '../../../film/domain/repositories/film.repository';
import { FilmNotFoundException } from '../../../film/domain/exceptions/film-not-found.exception';
import { FilmStatus } from '../../../film/domain/enums/film-status.enum';
import { MediaAssetRepository } from '../../../media/domain/repositories/media-asset.repository';
import { PremiereStatus } from '../../../premiere/domain/enums/premiere-status.enum';
import { PremiereRepository } from '../../../premiere/domain/repositories/premiere.repository';
import { StreamingAssetStatus } from '../../../streaming/domain/enums/streaming-asset-status.enum';
import { StreamingAssetRepository } from '../../../streaming/domain/repositories/streaming-asset.repository';
import { AnalyticsRepository } from '../../domain/repositories/analytics.repository';
import { ViewSession } from '../../domain/entities/view-session.entity';

@Injectable()
export class StartViewSessionService {
  constructor(
    private readonly filmRepository: FilmRepository,
    private readonly streamingAssetRepository: StreamingAssetRepository,
    private readonly mediaAssetRepository: MediaAssetRepository,
    private readonly premiereRepository: PremiereRepository,
    private readonly analyticsRepository: AnalyticsRepository,
  ) {}

  async execute(params: {
    filmId: string;
    viewerId: string;
    device: string | null;
  }) {
    const film = await this.filmRepository.findById(params.filmId);
    if (!film) {
      throw new FilmNotFoundException(params.filmId);
    }
    if (
      film.status !== FilmStatus.READY &&
      film.status !== FilmStatus.PUBLISHED
    ) {
      throw new ConflictException('This film is not available for playback.');
    }

    const premiere = await this.premiereRepository.findByFilmId(params.filmId);
    if (premiere?.status === PremiereStatus.SCHEDULED) {
      throw new ConflictException(
        'Playback analytics cannot start before the premiere goes live.',
      );
    }

    const streamingAsset =
      await this.streamingAssetRepository.findReadyByFilmId(params.filmId);
    if (!streamingAsset || streamingAsset.status !== StreamingAssetStatus.READY) {
      throw new ConflictException(
        'This film does not have a ready streaming asset.',
      );
    }

    const mediaAsset = await this.mediaAssetRepository.findById(
      streamingAsset.mediaAssetId,
    );
    if (
      !mediaAsset ||
      mediaAsset.durationSeconds === null ||
      !Number.isFinite(mediaAsset.durationSeconds) ||
      mediaAsset.durationSeconds <= 0
    ) {
      throw new ConflictException(
        'Verified film duration is not available for analytics.',
      );
    }

    const session = ViewSession.start({
      filmId: params.filmId,
      mediaAssetId: mediaAsset.id,
      viewerId: params.viewerId,
      device: params.device,
      durationSeconds: mediaAsset.durationSeconds,
    });
    await this.analyticsRepository.createSession(session);
    return {
      id: session.id,
      filmId: session.filmId,
      startedAt: session.startedAt,
      durationSeconds: session.durationSeconds,
    };
  }
}
