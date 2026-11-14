import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDetectorWithBackendFallback, petDetectionsFromPredictions, parseBehaviorManifest, scalePetDetectionsToSource, sceneDetectionsFromPredictions } from './petClassifier';

test('common animal detections are returned, ordered by model confidence', () => {
  const result = petDetectionsFromPredictions([
    { class: 'person', score: 0.99, bbox: [0, 0, 10, 10] },
    { class: 'cat', score: 0.7, bbox: [1, 2, 3, 4] },
    { class: 'dog', score: 0.92, bbox: [5, 6, 7, 8] },
    { class: 'bird', score: 0.95, bbox: [0, 0, 10, 10] },
  ]);
  assert.deepEqual(result.map(item => item.pet), ['bird', 'dog', 'cat']);
  assert.equal(result[0].confidence, 0.95);
  assert.equal('emotion' in result[0], false);
});

test('non-animal detections are retained as scene objects', () => {
  const scene = sceneDetectionsFromPredictions([
    { class: 'bird', score: 0.86, bbox: [0, 0, 10, 10] },
    { class: 'person', score: 0.75, bbox: [0, 0, 10, 10] },
    { class: 'dog', score: 0.92, bbox: [0, 0, 10, 10] },
  ]);
  assert.deepEqual(scene.pets.map(pet => pet.pet), ['dog', 'bird']);
  assert.deepEqual(scene.otherObjects.map(object => object.label), ['person']);
});

test('scaled model boxes map back to the original camera frame', () => {
  const scaled = petDetectionsFromPredictions([{ class: 'dog', score: 0.8, bbox: [10, 20, 30, 40] }]);
  assert.deepEqual(scalePetDetectionsToSource(scaled, 2, 1.5)[0].bbox, [20, 30, 60, 60]);
});

test('behavior adapter requires a specific posture-model manifest', () => {
  assert.throws(() => parseBehaviorManifest({ modelUrl: '/model.json' }));
  const manifest = parseBehaviorManifest({ modelUrl: '/models/behavior/model.json', modelVersion: 'posture-v1', inputSize: 224,
    outputMode: 'multi-label-sigmoid', labels: { dog: ['dog-play-bow'], cat: ['cat-slow-blink'] },
    validation: { datasetVersion: 'fixture-v1', evaluatedAt: '2026-11-14', heldOutAnimals: true,
      perCue: { 'dog-play-bow': { precision: 0.9, recall: 0.8, calibrationError: 0.05 }, 'cat-slow-blink': { precision: 0.9, recall: 0.8, calibrationError: 0.05 } } } });
  assert.equal(manifest.modelVersion, 'posture-v1');
});

test('detector startup falls back to CPU if WebGL cannot create the bundled model', async () => {
  const attempts: string[] = [];
  const loaded = await loadDetectorWithBackendFallback({
    setBackend: async backend => { attempts.push(backend); return true; },
    ready: async () => {},
  }, async () => {
    if (attempts.at(-1) === 'webgl') throw new Error('WebGL model load failed');
    return 'cpu model';
  });

  assert.deepEqual(attempts, ['webgl', 'cpu']);
  assert.deepEqual(loaded, { backend: 'cpu', model: 'cpu model' });
});

test('detector startup tries CPU when WebGL is unavailable', async () => {
  const attempts: string[] = [];
  const loaded = await loadDetectorWithBackendFallback({
    setBackend: async backend => { attempts.push(backend); return backend === 'cpu'; },
    ready: async () => {},
  }, async () => 'cpu model');

  assert.deepEqual(attempts, ['webgl', 'cpu']);
  assert.deepEqual(loaded, { backend: 'cpu', model: 'cpu model' });
});
