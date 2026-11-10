import assert from 'node:assert/strict';
import test from 'node:test';

import { createWorkflowNotification } from './email/templates/workflow-notification.template';

test('notification template escapes HTML and strips subject newlines', () => {
  const notification = createWorkflowNotification({
    type: 'film-ready',
    filmTitle: '<Premiere>\r\nBcc: victim@example.com',
  });

  assert.match(notification.html, /&lt;Premiere&gt;/);
  assert.doesNotMatch(notification.html, /<Premiere>/);
  assert.equal(notification.subject.includes('\r'), false);
  assert.equal(notification.subject.includes('\n'), false);
});
