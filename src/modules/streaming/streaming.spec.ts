import assert from 'node:assert/strict';
import test from 'node:test';

import { StreamingAsset } from './domain/entities/streaming-asset.entity';
import { StreamingAssetStatus } from './domain/enums/streaming-asset-status.enum';

test('streaming asset supports failure recovery before becoming ready', () => {
  const asset = StreamingAsset.create({
    filmId: 'film-1',
    mediaAssetId: 'asset-1',
    masterPlaylistKey: 'film-1/hls/master.m3u8',
  });

  asset.markFailed();
  assert.equal(asset.status, StreamingAssetStatus.FAILED);

  asset.retry();
  asset.markReady();
  assert.equal(asset.status, StreamingAssetStatus.READY);
  assert.throws(() => asset.markFailed());
});
