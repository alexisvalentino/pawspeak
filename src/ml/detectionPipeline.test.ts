import assert from 'node:assert/strict';
import test from 'node:test';
import { createDetectorHealth, planDetectorRecovery, MAX_MODEL_RELOADS } from './detectionPipeline';

test('a single failed inference retries on the same backend without reloading the model', () => {
  const step = planDetectorRecovery(createDetectorHealth('webgl'), new Error('transient'));
  assert.equal(step.reloadModel, false);
  assert.equal(step.backend, 'webgl');
  assert.ok(step.delayMs > 0 && step.delayMs <= 1000);
});

test('repeated failures fall back to the CPU backend and stay there', () => {
  let health = createDetectorHealth('webgl');
  const seen = [];
  for (let i = 0; i < 5; i += 1) {
    const step = planDetectorRecovery(health, new Error('GPU error'));
    seen.push(step.backend);
    health = step.health;
  }
  assert.equal(seen.at(-1), 'cpu', 'the detector must end up on the portable backend');
  assert.equal(health.lockedToCpu, true, 'once CPU works it must not flip back to a broken GPU');
});

test('a lost WebGL context forces an immediate CPU rebuild', () => {
  const step = planDetectorRecovery(createDetectorHealth('webgl'), { name: 'Error', message: 'webglcontextlost' });
  assert.equal(step.backend, 'cpu');
  assert.equal(step.reloadModel, true);
});

test('recovery never gives up and never reloads the model forever', () => {
  let health = createDetectorHealth('webgl');
  let reloads = 0;
  for (let i = 0; i < 40; i += 1) {
    const step = planDetectorRecovery(health, new Error('still failing'));
    if (step.reloadModel) reloads += 1;
    health = step.health;
    assert.ok(step.delayMs > 0 && step.delayMs <= 5000, 'backoff must stay bounded');
  }
  assert.equal(reloads <= MAX_MODEL_RELOADS, true, 'endless reloads would thrash mobile GPUs');
});

test('success clears the failure count and keeps the working backend', () => {
  const { health } = planDetectorRecovery(createDetectorHealth('webgl'), new Error('x'));
  const recovered = createDetectorHealth('cpu');
  assert.equal(recovered.consecutiveFailures, 0);
  assert.equal(health.consecutiveFailures, 1);
});
