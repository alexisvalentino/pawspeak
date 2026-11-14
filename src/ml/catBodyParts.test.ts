import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CAT_BODY_PARTS,
  aggregateBodyParts,
  catCueFromBodyParts,
  parseCatBodyPartDetections,
  type CatBodyPart,
  type PartDetection,
} from './catBodyParts';

const part = (label: CatBodyPart, confidence: number): PartDetection => ({
  part: label,
  confidence,
  bbox: [10, 10, 50, 50],
});

/** Raw shape as it arrives from the native plugin, before normalization. */
const rawPart = (label: string, confidence: number) => ({
  label,
  confidence,
  bbox: [10, 10, 50, 50] as [number, number, number, number],
});

test('the body-part vocabulary matches the DeepCat label set', () => {
  assert.deepEqual([...CAT_BODY_PARTS], ['ears', 'eyes', 'mouth', 'tail', 'body']);
});

test('detections are grouped per part and clamped to one box per part', () => {
  const parsed = parseCatBodyPartDetections([
    rawPart('tail', 0.4), rawPart('tail', 0.8), rawPart('eyes', 0.6), rawPart('chair', 0.9),
  ]);
  assert.equal(parsed.length, 2);
  assert.equal(parsed.find(item => item.part === 'tail')?.confidence, 0.8, 'highest-scoring box per part wins');
  assert.equal(parsed.find(item => item.part === 'eyes')?.confidence, 0.6);
});

test('malformed part detections are discarded', () => {
  assert.deepEqual(parseCatBodyPartDetections([
    { label: 'tail', confidence: Number.NaN, bbox: [0, 0, 1, 1] },
    { label: 'eyes', confidence: 0.5, bbox: [0, 0, 1] as unknown as [number, number, number, number] },
  ]), []);
});

test('a missing tail or eyes yields no cue instead of a guess', () => {
  const onlyBody = aggregateBodyParts([part('body', 0.9)]);
  assert.equal(catCueFromBodyParts(onlyBody), null, 'a body box alone says nothing about mood');
  assert.equal(catCueFromBodyParts(aggregateBodyParts([])), null);
});

test('tail and eyes must agree before PawSpeak reports a direction', () => {
  const agreeing = aggregateBodyParts([
    part('tail', 0.8), part('eyes', 0.7),
  ]);
  const cue = catCueFromBodyParts(agreeing);
  assert.ok(cue, 'two corroborating parts should produce a candidate');
  assert.ok(cue!.confidence <= Math.min(0.8, 0.7), 'agreement lowers the score, never inflates it');

  // One strong part plus one unrelated part must not fabricate a cue.
  const disagreeing = aggregateBodyParts([part('tail', 0.8), part('ears', 0.75)]);
  assert.equal(catCueFromBodyParts(disagreeing), null, 'one part alone is not enough for a cue');
});

test('cue labels are cautious observations, never emotion claims', () => {
  const cue = catCueFromBodyParts(aggregateBodyParts([part('tail', 0.8), part('eyes', 0.7)]));
  assert.ok(cue);
  const text = `${cue!.label} ${cue!.caveat}`.toLowerCase();
  for (const banned of ['happy', 'angry', 'aggressive', 'sad', 'fear', 'love', 'hate']) {
    assert.equal(text.includes(banned), false, `"${banned}" is an emotion claim`);
  }
});
