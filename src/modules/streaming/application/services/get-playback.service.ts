import { ConflictException, Inject, Injectable } from '@nestjs/common';

import { PlaybackUrlProvider } from '../../../../infrastructure/cdn/playback-url-provider.interface';
import { FilmRepository } from '../../../film/domain/repositories/film.repository';
import { FilmStatus } from '../../../film/domain/enums/film-status.enum';
import { FilmNotFoundException } from '../../../film/domain/exceptions/film-not-found.exception';
import { StreamingAssetRepository } from '../../domain/repositories/streaming-asset.repository';
import { StreamingAssetStatus } from '../../domain/enums/streaming-asset-status.enum';
import { MetricsService } from '../../../../infrastructure/observability/metrics.service';
import { PremiereStatus } from '../../../premiere/domain/enums/premiere-status.enum';
import { PremiereRepository } from '../../../premiere/domain/repositories/premiere.repository';

@Injectable()
export class GetPlaybackService {
  constructor(
    private readonly filmRepository: FilmRepository,
    private readonly streamingAssetRepository: StreamingAssetRepository,
    private readonly premiereRepository: PremiereRepository,
    @Inject(PlaybackUrlProvider)
    private readonly playbackUrlProvider: PlaybackUrlProvider,
    private readonly metrics: MetricsService,
  ) {}

  async execute(filmId: string): Promise<{
    filmId: string;
    playbackUrl: string;
    expiresAt: Date;
    status: StreamingAssetStatus;
    cookies: string[];
  }> {
    this.metrics.increment('playback_requests_total');
    this.metrics.adjustGauge('playback_requests_in_flight', 1);
    try {
      const film = await this.filmRepository.findById(filmId);
      if (!film) {
        throw new FilmNotFoundException(filmId);
      }

      if (
        film.status !== FilmStatus.READY &&
        film.status !== FilmStatus.PUBLISHED
      ) {
        throw new ConflictException(
          `Film ${filmId} is not ready for playback.`,
        );
      }

      const premiere = await this.premiereRepository.findByFilmId(filmId);
      if (premiere?.status === PremiereStatus.SCHEDULED) {
        throw new ConflictException(
          `Film ${filmId} is unavailable until its scheduled premiere begins.`,
        );
      }

      const streamingAsset =
        await this.streamingAssetRepository.findReadyByFilmId(filmId);
      if (
        !streamingAsset ||
        streamingAsset.status !== StreamingAssetStatus.READY
      ) {
        throw new ConflictException(
          `Film ${filmId} has no ready streaming asset.`,
        );
      }

      const playbackAccess =
        await this.playbackUrlProvider.generatePlaybackAccess(
          filmId,
          streamingAsset.masterPlaylistKey,
        );
      return {
        filmId,
        playbackUrl: playbackAccess.playbackUrl,
        expiresAt: playbackAccess.expiresAt,
        status: streamingAsset.status,
        cookies: playbackAccess.cookies,
      };
    } finally {
      this.metrics.adjustGauge('playback_requests_in_flight', -1);
    }
  }
}
