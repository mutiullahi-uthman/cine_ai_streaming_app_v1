import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSign } from 'node:crypto';

import {
  PlaybackAccess,
  PlaybackUrlProvider,
} from './playback-url-provider.interface';

@Injectable()
export class CloudFrontPlaybackUrlProvider
  implements PlaybackUrlProvider
{
  constructor(private readonly configService: ConfigService) {}

  async generatePlaybackAccess(
    filmId: string,
    masterPlaylistKey: string,
  ): Promise<PlaybackAccess> {
    if (
      !/^[A-Za-z0-9_-]{1,128}$/.test(filmId) ||
      masterPlaylistKey.startsWith('/') ||
      masterPlaylistKey.split('/').some(
        (segment) =>
          segment === '' ||
          segment === '.' ||
          segment === '..' ||
          segment.includes('\\'),
      )
    ) {
      throw new Error('The HLS master playlist key is invalid.');
    }

    const configuredBaseUrl =
      this.configService.getOrThrow<string>('CDN_BASE_URL');
    const baseUrl = new URL(
      configuredBaseUrl.endsWith('/')
        ? configuredBaseUrl
        : `${configuredBaseUrl}/`,
    );
    const cookieDomain =
      this.configService.getOrThrow<string>('CDN_COOKIE_DOMAIN');
    const keyPairId =
      this.configService.getOrThrow<string>('CLOUDFRONT_KEY_PAIR_ID');
    const privateKey = this.configService
      .getOrThrow<string>('CLOUDFRONT_PRIVATE_KEY')
      .replace(/\\n/g, '\n');
    if (
      !['http:', 'https:'].includes(baseUrl.protocol) ||
      baseUrl.username ||
      baseUrl.password ||
      baseUrl.search ||
      baseUrl.hash ||
      baseUrl.pathname !== '/'
    ) {
      throw new Error(
        'CDN_BASE_URL must be an HTTP(S) URL without credentials, query, or fragment.',
      );
    }
    const normalizedCookieDomain = cookieDomain.replace(/^\./, '');
    if (
      !/^(?:[A-Za-z0-9-]+\.)*[A-Za-z0-9-]+$/.test(normalizedCookieDomain) ||
      (
        baseUrl.hostname !== normalizedCookieDomain &&
        !baseUrl.hostname.endsWith(`.${normalizedCookieDomain}`)
      )
    ) {
      throw new Error(
        'CDN_COOKIE_DOMAIN must be the CDN hostname or one of its parent domains.',
      );
    }
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(keyPairId)) {
      throw new Error('CLOUDFRONT_KEY_PAIR_ID is invalid.');
    }

    const expectedPrefix = `films/${filmId}/hls/`;
    if (!masterPlaylistKey.startsWith(expectedPrefix)) {
      throw new Error(
        'The HLS master playlist does not belong to the requested film.',
      );
    }

    const encodedKey = masterPlaylistKey
      .split('/')
      .map(encodeURIComponent)
      .join('/');
    const playbackUrl = new URL(encodedKey, baseUrl).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const policy = JSON.stringify({
      Statement: [{
        Resource: `${baseUrl.origin}/films/${filmId}/hls/*`,
        Condition: {
          DateLessThan: {
            'AWS:EpochTime': Math.floor(expiresAt.getTime() / 1000),
          },
        },
      }],
    });
    const signer = createSign('RSA-SHA1');
    signer.update(policy);
    signer.end();
    const signature = signer
      .sign(privateKey)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/=/g, '_')
      .replace(/\//g, '~');
    const encodedPolicy = Buffer.from(policy)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/=/g, '_')
      .replace(/\//g, '~');
    const cookiePath = `/films/${filmId}/hls/`;
    const cookieAttributes =
      `Domain=${normalizedCookieDomain}; Path=${cookiePath}; Max-Age=300; Secure; HttpOnly; SameSite=None`;

    return {
      playbackUrl,
      expiresAt,
      cookies: [
        `CloudFront-Policy=${encodedPolicy}; ${cookieAttributes}`,
        `CloudFront-Signature=${signature}; ${cookieAttributes}`,
        `CloudFront-Key-Pair-Id=${keyPairId}; ${cookieAttributes}`,
      ],
    };
  }
}
