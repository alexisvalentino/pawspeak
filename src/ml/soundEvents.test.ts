import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { decodeSoundEvents, SOUND_EVENT_LABELS } from './soundEvents';

test('decodes YAMNet window scores into supported animal sound events', () => {
  const scores = new Float32Array(3 * 521);
  scores[70] = 0.73;
  scores[521 + 78] = 0.61;
  scores[2 * 521 + 74] = 0.52;
  const result = decodeSoundEvents(scores, 3);

  assert.deepEqual(result.map(event => event.label), ['Bark', 'Meow', 'Growling']);
  result.forEach((event, index) => assert.ok(Math.abs(event.score - [0.73, 0.61, 0.52][index]) < 0.0001));
  assert.equal(SOUND_EVENT_LABELS[70], 'Bark');
});

test('bundled YAMNet weights match the downloaded Google model artifact', () => {
  const model = readFileSync(new URL('../../public/models/sound-event/yamnet.tflite', import.meta.url));
  assert.equal(model.byteLength, 4_126_810);
  assert.equal(model.subarray(4, 8).toString('ascii'), 'TFL3');
  assert.equal(createHash('sha256').update(model).digest('hex').toUpperCase(), '10C95EA3EB9A7BB4CB8BDDF6FEB023250381008177AC162CE169694D05C317DE');
});

test('ignores unsupported events and low-scoring or malformed results', () => {
  const scores = new Float32Array(521);
  scores[0] = 0.99; // Speech is not a supported pet sound event.
  scores[70] = 0.05;
  assert.deepEqual(decodeSoundEvents(scores, 1), []);
  assert.deepEqual(decodeSoundEvents(new Float32Array(500), 1), []);
  scores[70] = Number.NaN;
  assert.deepEqual(decodeSoundEvents(scores, 1), []);
});
