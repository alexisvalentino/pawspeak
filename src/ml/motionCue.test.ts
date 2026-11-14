import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasVisiblePositionChange, type MotionSample } from './motionCue';

const sample = (time: number, x: number, y = 100): MotionSample => ({ time, bbox: [x, y, 120, 100] });

test('reports sustained tracked position change rather than an action or emotion', () => {
  assert.equal(hasVisiblePositionChange([sample(0, 100), sample(900, 125), sample(1800, 165)]), true);
});

test('stays unclear for short clips and ordinary detector jitter', () => {
  assert.equal(hasVisiblePositionChange([sample(0, 100), sample(400, 130), sample(800, 160)]), false);
  assert.equal(hasVisiblePositionChange([sample(0, 100), sample(900, 103), sample(1800, 99)]), false);
});
