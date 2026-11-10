import assert from 'node:assert/strict';
import test from 'node:test';

import { ViewSession } from './domain/entities/view-session.entity';

test('analytics counts playback time with a per-heartbeat cap', () => {
  const startedAt = new Date('2026-01-01T00:00:00.000Z');
  const session = ViewSession.start({
    filmId: 'film-1',
    mediaAssetId: 'asset-1',
    viewerId: 'viewer-1',
    device: 'desktop',
    durationSeconds: 100,
    now: startedAt,
  });

  assert.equal(
    session.recordHeartbeat({
      now: new Date(startedAt.getTime() + 90_000),
      playing: true,
    }),
    60,
  );
  assert.equal(session.watchDurationSeconds, 60);
  assert.equal(session.completionPercent, 60);
  assert.equal(
    session.recordHeartbeat({
      now: new Date(startedAt.getTime() + 120_000),
      playing: false,
    }),
    0,
  );
  assert.equal(session.watchDurationSeconds, 60);
});
