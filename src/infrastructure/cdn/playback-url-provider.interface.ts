export interface PlaybackAccess {
  playbackUrl: string;
  expiresAt: Date;
  cookies: string[];
}

export abstract class PlaybackUrlProvider {
  abstract generatePlaybackAccess(
    filmId: string,
    masterPlaylistKey: string,
  ): Promise<PlaybackAccess>;
}
