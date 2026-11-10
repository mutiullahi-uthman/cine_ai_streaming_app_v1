import assert from 'node:assert/strict';
import test from 'node:test';

import { MediaAsset } from './domain/entities/media-asset.entity';
import { MediaStatus } from './domain/enums/media-status.enum';

test('media asset can become ready only after processing starts', () => {
  const asset = MediaAsset.create({
    filmId: 'film-1',
    objectKey: 'film/source.mp4',
    etag: 'etag',
    sizeBytes: 100n,
    contentType: 'video/mp4',
  });

  assert.equal(asset.status, MediaStatus.UPLOADED);
  assert.throws(() => asset.markReady());

  asset.markProcessing();
  asset.setDurationSeconds(120);
  asset.markReady();

  assert.equal(asset.durationSeconds, 120);
  assert.equal(asset.status, MediaStatus.READY);
});
