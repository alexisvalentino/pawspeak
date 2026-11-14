import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DictionaryScreen } from './DictionaryScreen';

test('Learn cards put the named cue before its plain-words meaning', () => {
  const markup = renderToStaticMarkup(React.createElement(DictionaryScreen, {
    species: 'dog',
    onSpeciesChange: () => {},
  }));

  assert.match(markup, /<strong>Loose, wide tail wag<\/strong><span class="dictionary-card-meaning">I(?:&#x27;|')m relaxed and friendly<\/span>/);
});
