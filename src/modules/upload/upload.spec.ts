import assert from 'node:assert/strict';
import test from 'node:test';

import { UploadSession } from './domain/entities/upload-session.entity';
import { UploadStatus } from './domain/enums/upload-status.enum';

test('upload session transitions through upload to completion', () => {
  const upload = UploadSession.create({
    filmId: 'film-1',
    objectKey: 'film-1/source.mp4',
    storageUploadId: 'multipart-1',
    expectedSize: 1024n,
    expiresAt: new Date('2026-12-01T00:00:00.000Z'),
  });

  upload.start();
  assert.equal(upload.status, UploadStatus.UPLOADING);

  upload.complete({
    sizeBytes: 1024n,
    etag: 'etag',
    contentType: 'video/mp4',
  });
  assert.equal(upload.status, UploadStatus.COMPLETED);
  assert.equal(upload.getDomainEvents().length, 3);
});
