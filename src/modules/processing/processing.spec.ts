import assert from 'node:assert/strict';
import test from 'node:test';

import { ProcessingJob } from './domain/entities/processing-job.entity';
import { ProcessingStatus } from './domain/enums/processing-status.enum';
import { ProcessingStep } from './domain/enums/processing-step.enum';

test('processing job records progress and schedules retries before the limit', () => {
  const job = ProcessingJob.create('asset-1');

  job.start();
  job.beginStep(ProcessingStep.TRANSCODING);
  const nextStatus = job.fail('temporary failure', 4);

  assert.equal(nextStatus, ProcessingStatus.PENDING);
  assert.equal(job.status, ProcessingStatus.PENDING);
  assert.equal(job.attempts, 1);
  assert.equal(job.errorMessage, 'temporary failure');
});
