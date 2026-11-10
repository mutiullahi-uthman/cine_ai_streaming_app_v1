import assert from 'node:assert/strict';
import test from 'node:test';

import { Film } from './domain/entities/film.entity';
import { FilmStatus } from './domain/enums/film-status.enum';

test('film follows the upload, processing, ready, and publish lifecycle', () => {
  const film = Film.create({
    creatorId: 'creator-1',
    title: '  Premiere  ',
    synopsis: '  A story.  ',
  });

  assert.equal(film.title, 'Premiere');
  assert.equal(film.synopsis, 'A story.');
  assert.equal(film.status, FilmStatus.DRAFT);

  film.markUploading();
  film.markProcessing();
  film.markReady();
  film.publish();

  assert.equal(film.status, FilmStatus.PUBLISHED);
  assert.equal(film.getDomainEvents().length, 5);
});
