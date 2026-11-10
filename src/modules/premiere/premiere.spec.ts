import assert from 'node:assert/strict';
import test from 'node:test';

import { Premiere } from './domain/entities/premiere.entity';
import { PremiereStatus } from './domain/enums/premiere-status.enum';

test('premiere can go live only at its scheduled time and then end', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const startsAt = new Date('2026-01-01T01:00:00.000Z');
  const premiere = Premiere.schedule({
    filmId: 'film-1',
    startsAt,
    now,
  });

  assert.equal(premiere.status, PremiereStatus.SCHEDULED);
  assert.throws(() => premiere.goLive(now));

  premiere.goLive(startsAt);
  assert.equal(premiere.status, PremiereStatus.LIVE);

  premiere.end();
  assert.equal(premiere.status, PremiereStatus.ENDED);
});
