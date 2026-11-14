import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BODY_LANGUAGE } from '../data/bodyLanguage';
import { CueIllustration, cueIllustrationFor } from './CueIllustration';

test('every dictionary cue has a cue-specific vector illustration', () => {
  for (const entry of BODY_LANGUAGE) {
    assert.ok(cueIllustrationFor(entry.id), `Missing illustration for ${entry.id}`);
  }
});

test('different signals in the same body area get different illustrations', () => {
  assert.notEqual(cueIllustrationFor('cat-tail-up'), cueIllustrationFor('cat-tail-lashing'));
  assert.notEqual(cueIllustrationFor('cat-tail-lashing'), cueIllustrationFor('dog-tail-loose-wag'));
  assert.notEqual(cueIllustrationFor('cat-ears-forward'), cueIllustrationFor('cat-ears-flat'));
  assert.notEqual(cueIllustrationFor('cat-slow-blink'), cueIllustrationFor('cat-staring'));
});

test('Learn renders inline SVG artwork for each dog cue without raster images', () => {
  const dogCues = BODY_LANGUAGE.filter(entry => entry.species === 'dog');
  const markup = dogCues.map(entry => renderToStaticMarkup(React.createElement(CueIllustration, { entry }))).join('');
  const symbols = [...markup.matchAll(/data-cue-illustration="([^"]+)"/g)].map(match => match[1]);

  assert.equal(symbols.length, dogCues.length);
  assert.ok(new Set(symbols).size >= 30);
  assert.match(markup, /<svg class="cue-art"/);
  assert.doesNotMatch(markup, /<image\b|https?:\/\//);
});
