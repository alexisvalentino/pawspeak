import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectBoxToCover, updatePetTracks, type PetTrackState } from './petTracking';

const dog = (bbox: [number, number, number, number], confidence = 0.9) => ({ pet: 'dog' as const, confidence, bbox });
const initial = (): PetTrackState => ({ tracks: [], nextId: 1 });

test('keeps a pet track id across nearby detections and smooths box movement', () => {
  const first = updatePetTracks(initial(), [dog([100, 80, 200, 180])]);
  const next = updatePetTracks(first, [dog([120, 80, 200, 180], 0.95)]);

  assert.equal(next.tracks.length, 1);
  assert.equal(next.tracks[0].id, first.tracks[0].id);
  assert.equal(next.tracks[0].bbox[0], 110);
  assert.equal(next.tracks[0].confidence, 0.95);
});

test('assigns detections one-to-one and never matches a cat to a dog track', () => {
  const first = updatePetTracks(initial(), [dog([0, 0, 100, 100]), { ...dog([300, 0, 100, 100]), pet: 'cat' as const }]);
  const next = updatePetTracks(first, [{ ...dog([305, 0, 100, 100]), pet: 'cat' as const }, dog([5, 0, 100, 100]), dog([5, 0, 100, 100])]);

  assert.equal(next.tracks.length, 3);
  assert.equal(next.tracks.filter(track => track.pet === 'dog').length, 2);
  assert.equal(next.tracks.filter(track => track.pet === 'cat').length, 1);
  assert.equal(new Set(next.tracks.map(track => track.id)).size, 3);
});

test('briefly holds missed tracks to prevent flicker, then expires them', () => {
  const first = updatePetTracks(initial(), [dog([100, 80, 200, 180])]);
  const held = updatePetTracks(first, []);
  const expired = updatePetTracks(held, []);

  assert.equal(held.tracks[0].missedFrames, 1);
  assert.deepEqual(expired.tracks, []);
});

test('projects detections through the same center crop as the live preview', () => {
  const projected = projectBoxToCover([320, 200, 300, 300], 1280, 960, 350, 350);
  assert.ok(projected);
  assert.ok(projected.left >= 0 && projected.left + projected.width <= 100);
  assert.ok(projected.top >= 0 && projected.top + projected.height <= 100);
  assert.equal(projectBoxToCover([0, 0, 10, 10], 0, 960, 350, 350), null);
});
