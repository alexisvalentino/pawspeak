import assert from 'node:assert/strict';
import test from 'node:test';
import { decideLiveFailure, LIVE_RETRY_LIMIT } from './liveDetectionLoop';

test('a transient detector failure keeps the live loop running and retries quickly', () => {
  const first = decideLiveFailure(0);
  assert.equal(first.retry, true, 'the first failure must not stop live detection');
  assert.equal(first.showUnavailable, false, 'one hiccup should not claim the detector is broken');
  assert.ok(first.retryDelay >= 200 && first.retryDelay <= 1000);
});

test('repeated failures back off but never stop the loop', () => {
  let failures = 0;
  const delays: number[] = [];
  for (let i = 0; i < 8; i += 1) {
    const decision = decideLiveFailure(failures);
    delays.push(decision.retryDelay);
    assert.equal(decision.retry, true, `failure ${i + 1} must still schedule a retry`);
    failures = decision.consecutiveFailures;
  }
  assert.equal(delays[1] > delays[0], true, 'the second delay should be longer than the first');
  assert.equal(Math.max(...delays) <= 5000, true, 'backoff must stay bounded so recovery is quick');
  assert.equal(failures, 8);
});

test('persistent failure is reported to the user but the loop still retries so it can self-heal', () => {
  const decision = decideLiveFailure(LIVE_RETRY_LIMIT);
  assert.equal(decision.showUnavailable, true);
  assert.equal(decision.retry, true, 'a stalled GPU or slow first model load must recover without a page reload');
});

test('a missing video frame is treated as transient, not as a broken detector', () => {
  const decision = decideLiveFailure(0, { name: 'InvalidStateError', message: 'The video element has no data.' });
  assert.equal(decision.retry, true);
  assert.equal(decision.showUnavailable, false);
});
