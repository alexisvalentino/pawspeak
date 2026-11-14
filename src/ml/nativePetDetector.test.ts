import assert from 'node:assert/strict';
import test from 'node:test';
import { sceneFromNativeDetections } from './nativePetDetector';

const dog = { label: 'dog', confidence: 0.74, bbox: [10, 20, 100, 120] as [number, number, number, number] };

test('native detections are split into supported pets and other scene objects', () => {
  const scene = sceneFromNativeDetections([
    { label: 'chair', confidence: 0.61, bbox: [0, 0, 50, 50] },
    dog,
    { label: 'cat', confidence: 0.88, bbox: [5, 5, 40, 40] },
  ]);
  assert.deepEqual(scene.pets.map(pet => pet.pet), ['cat', 'dog'], 'pets stay sorted by confidence');
  assert.deepEqual(scene.otherObjects.map(object => object.label), ['chair']);
});

test('malformed native output is discarded instead of reaching the UI', () => {
  const scene = sceneFromNativeDetections([
    { label: 'dog', confidence: Number.NaN, bbox: [0, 0, 1, 1] },
    { label: 'cat', confidence: 0.5, bbox: [0, 0, 1] as unknown as [number, number, number, number] },
    { label: 'bird', confidence: 0.5, bbox: [0, 0, 1, Number.POSITIVE_INFINITY] },
    dog,
  ]);
  assert.equal(scene.pets.length, 1);
  assert.equal(scene.pets[0].pet, 'dog');
  assert.deepEqual(scene.otherObjects, []);
});

test('only the two highest-scoring non-animal objects are reported', () => {
  const scene = sceneFromNativeDetections([
    { label: 'chair', confidence: 0.9, bbox: [0, 0, 10, 10] },
    { label: 'couch', confidence: 0.8, bbox: [0, 0, 10, 10] },
    { label: 'tv', confidence: 0.7, bbox: [0, 0, 10, 10] },
  ]);
  assert.deepEqual(scene.otherObjects.map(object => object.label), ['chair', 'couch']);
});
