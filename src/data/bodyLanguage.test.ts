import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BODY_LANGUAGE } from './bodyLanguage';

test('the PawSpeak dictionary includes the complete sourced dog and cat corpus', () => {
  assert.equal(BODY_LANGUAGE.length, 102);
  assert.equal(BODY_LANGUAGE.filter(entry => entry.species === 'cat').length, 49);
  assert.equal(BODY_LANGUAGE.filter(entry => entry.species === 'dog').length, 53);
  assert.ok(BODY_LANGUAGE.every(entry => entry.sources.length > 0));
  assert.ok(BODY_LANGUAGE.every(entry => entry.related.every(related => BODY_LANGUAGE.some(candidate => candidate.id === related.id))));
  assert.ok(BODY_LANGUAGE.every(entry => entry.sources.every(source => /^https:\/\//.test(source.url))));
});

test('dictionary wording and evidence are preserved for representative cat and dog entries', () => {
  const cat = BODY_LANGUAGE.find(entry => entry.id === 'cat-tail-up');
  assert.ok(cat);
  assert.equal(cat.plainWords, "Hi! I'm friendly and happy to see you");
  assert.equal(cat.confidence, 8);
  assert.equal(cat.sources[0].number, 1);
  assert.match(cat.whatToDo, /offer a hand at nose level/);
  assert.ok(cat.sources.some(source => source.url === 'https://pubmed.ncbi.nlm.nih.gov/18930121/'));

  const dog = BODY_LANGUAGE.find(entry => entry.id === 'dog-play-bow');
  assert.ok(dog);
  assert.equal(dog.plainWords, "Let's play!");
  assert.equal(dog.status, 'Safe');
  assert.ok(dog.sources.length > 0);
});
