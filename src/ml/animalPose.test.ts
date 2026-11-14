import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ANIMAL_POSE_KEYPOINT_NAMES, classifyPoseSignals, createPoseCropRect, decodeAnimalPose, preprocessPoseRgba } from './animalPose';

function makePose(points: Array<[number, number]>) {
  return points.map(([x, y], index) => ({ name: ANIMAL_POSE_KEYPOINT_NAMES[index], x, y, certainty: 0.9 }));
}

test('decodes RTMPose SimCC tensors into named AP-10K coordinates', () => {
  const x = new Float32Array(17 * 512).fill(-10);
  const y = new Float32Array(17 * 512).fill(-10);
  x[3 * 512 + 240] = 10;
  y[3 * 512 + 300] = 10;

  const pose = decodeAnimalPose(x, y);
  assert.ok(pose);
  assert.equal(pose.points.length, 17);
  assert.deepEqual(pose.points[3], { name: 'neck', x: 120, y: 150, certainty: pose.points[3].certainty });
  assert.ok(pose.points[3].certainty > 0.99);
  assert.equal(pose.points[4].name, 'tail-root');
});

test('rejects malformed or non-finite SimCC model outputs', () => {
  assert.equal(decodeAnimalPose(new Float32Array(100), new Float32Array(100)), null);
  const invalid = new Float32Array(17 * 512).fill(0);
  invalid[0] = Number.NaN;
  assert.equal(decodeAnimalPose(invalid, new Float32Array(17 * 512)), null);
});

test('uniform SimCC outputs stay uncertain instead of becoming a posture guess', () => {
  const flat = new Float32Array(17 * 512);
  const pose = decodeAnimalPose(flat, flat);
  assert.ok(pose);
  assert.ok(pose.points.every(point => point.certainty < 0.005));
  assert.equal(classifyPoseSignals(pose.points), 'unclear');
});

test('reports only measurable extended or tucked limb geometry from a side view', () => {
  const extended = makePose([
    [80, 100], [90, 102], [100, 100], [120, 100], [200, 100],
    [105, 100], [106, 135], [108, 180], [135, 100], [136, 135], [138, 180],
    [180, 102], [181, 140], [183, 180], [195, 102], [196, 140], [198, 180],
  ]);
  assert.equal(classifyPoseSignals(extended), 'limbs-extended');

  const tucked = extended.map(point => ({ ...point }));
  for (const index of [7, 10, 13, 16]) tucked[index].y = 112;
  assert.equal(classifyPoseSignals(tucked), 'limbs-tucked');
});

test('keeps posture unclear for missing landmarks and steeply angled bodies', () => {
  const extended = makePose([
    [80, 100], [90, 102], [100, 100], [120, 100], [200, 100],
    [105, 100], [106, 135], [108, 180], [135, 100], [136, 135], [138, 180],
    [180, 102], [181, 140], [183, 180], [195, 102], [196, 140], [198, 180],
  ]);
  assert.equal(classifyPoseSignals(extended.map((point, index) => index === 10 ? { ...point, certainty: 0 } : point)), 'unclear');
  assert.equal(classifyPoseSignals(extended.map((point, index) => index === 4 ? { ...point, y: 170 } : point)), 'unclear');
});

test('creates a padded square crop that contains the detected animal even beyond frame edges', () => {
  const rect = createPoseCropRect(640, 480, [4, 60, 300, 360]);
  assert.ok(rect);
  assert.ok(rect.x <= 4 && rect.y <= 60);
  assert.ok(rect.x + rect.size >= 304 && rect.y + rect.size >= 420);

  const wideAnimal = createPoseCropRect(640, 480, [30, 100, 560, 260]);
  assert.ok(wideAnimal);
  assert.ok(wideAnimal.size > 480);
  assert.ok(wideAnimal.x <= 30 && wideAnimal.x + wideAnimal.size >= 590);
  assert.ok(wideAnimal.y <= 100 && wideAnimal.y + wideAnimal.size >= 360);
});

test('normalizes resized RGBA image pixels into AP-10K NCHW RGB input', () => {
  const values = preprocessPoseRgba(new Uint8ClampedArray([255, 0, 0, 255]), 1, 1);
  assert.equal(values.length, 3);
  assert.ok(Math.abs(values[0] - (255 - 123.675) / 58.395) < 0.0001);
  assert.ok(Math.abs(values[1] - (0 - 116.28) / 57.12) < 0.0001);
  assert.ok(Math.abs(values[2] - (0 - 103.53) / 57.375) < 0.0001);
});

test('bundled AP-10K weights match the downloaded model artifact', () => {
  const model = readFileSync(new URL('../../public/models/animal-pose/rtm_animal_fp16.tflite', import.meta.url));
  assert.equal(model.byteLength, 27_526_176);
  assert.equal(createHash('sha256').update(model).digest('hex').toUpperCase(), '7FBFC03239CEBC1F657EFAB722849BC9B30D36D3D4371118AED2AAF4041E742F');
});
