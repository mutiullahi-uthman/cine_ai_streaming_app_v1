import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CloudFrontPlaybackUrlProvider } from './cloudfront-playback-url.provider';
import { PlaybackUrlProvider } from './playback-url-provider.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    CloudFrontPlaybackUrlProvider,
    {
      provide: PlaybackUrlProvider,
      useExisting: CloudFrontPlaybackUrlProvider,
    },
  ],
  exports: [PlaybackUrlProvider],
})
export class CdnModule {}
