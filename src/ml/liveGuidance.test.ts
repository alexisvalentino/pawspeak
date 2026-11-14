import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLiveGuidance } from './liveGuidance';

const pet = { pet: 'dog' as const, confidence: 0.9, bbox: [100, 80, 300, 300] as [number, number, number, number] };
test('live coach reports useful lighting and pet-count states', () => {
  const dark = buildLiveGuidance([], 30, 640, 480);
  assert.equal(dark[0].status, 'warn');
  assert.equal(dark[1].detail, 'Show one animal');
  const multiple = buildLiveGuidance([pet, { ...pet, pet: 'cat' }], 130, 640, 480);
  assert.equal(multiple[1].detail, 'One at a time');
});

test('live coach warns about cutoff or distant pets without claiming posture recognition', () => {
  const cutoff = buildLiveGuidance([{ ...pet, bbox: [0, 100, 300, 400] }], 130, 640, 480);
  assert.equal(cutoff[2].detail, 'Move back a little');
  const small = buildLiveGuidance([{ ...pet, bbox: [250, 200, 70, 60] }], 130, 640, 480);
  assert.equal(small[2].detail, 'Come a little closer');
  const good = buildLiveGuidance([pet], 130, 640, 480);
  assert.equal(good.every(check => check.status === 'good'), true);
});
