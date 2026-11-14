import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reducer, migrateState, validateObservation, suggestions, exportJournal } from './journal';
import { DogProfile, Observation } from '../types/journal';

const dog: DogProfile = { id: 'dog-1', name: 'Milo', breed: 'Collie' };
const observation: Observation = { id: 'obs-1', petId: dog.id, createdAt: '2026-11-11T12:00:00.000Z',
  occurredAt: '2026-11-11T10:00', cues: ['Play bow: front down, rear up', 'Relaxed, loose body'],
  context: { activity: 'Toy play', environment: 'Garden', nearby: 'Guardian', recentEvent: 'Toy offered', notes: 'Play bow followed by retrieving a toy.' },
  interpretation: null, hasMedia: false, mediaConsent: false };
const state = reducer({ version: 2, dogs: [], activeDogId: null, observations: [] }, { type: 'saveDog', dog });

test('a new journal is empty, not fabricated user data', () => {
  const result = migrateState(null, null);
  assert.equal(result.dogs.length, 0);
  assert.equal(result.observations.length, 0);
});
test('example journal cannot be recreated and stored demo data is removed without touching real notes', () => {
  const empty = { version: 2 as const, dogs: [], activeDogId: null, observations: [] };
  assert.equal(reducer(empty, { type: 'startDemo' }), empty);
  const raw = JSON.stringify({ version: 2, activeDogId: 'demo-dog', demoDismissed: false,
    dogs: [{ id: 'demo-dog', name: 'Milo', breed: 'Cocker spaniel' }, dog],
    observations: [{ ...observation, id: 'demo-observation', petId: 'demo-dog' }, observation] });
  const restored = migrateState(raw, null, true);
  assert.deepEqual(restored.dogs, [dog]);
  assert.equal(restored.activeDogId, dog.id);
  assert.deepEqual(restored.observations, [observation]);
});

test('a journal can save, edit and delete an observation without XP or quotes', () => {
  const saved = reducer(state, { type: 'saveObservation', observation });
  assert.equal(saved.observations.length, 1);
  const edited = reducer(saved, { type: 'saveObservation', observation: { ...observation, interpretation: suggestions(observation.cues, observation.context) } });
  assert.ok(edited.observations[0].interpretation?.includes('playful invitation'));
  assert.equal(edited.observations[0].hasMedia, false);
  assert.equal(reducer(edited, { type: 'deleteObservation', id: observation.id }).observations.length, 0);
});
test('deleting a dog deletes only their records and chooses a valid active profile', () => {
  const other = { ...dog, id: 'dog-2', name: 'Pip' };
  let current = reducer(state, { type: 'saveDog', dog: other });
  current = reducer(current, { type: 'saveObservation', observation });
  current = reducer(current, { type: 'saveObservation', observation: { ...observation, id: 'obs-2', petId: other.id } });
  current = reducer(current, { type: 'deleteDog', id: dog.id });
  assert.equal(current.observations.length, 1);
  assert.equal(current.observations[0].petId, other.id);
  assert.equal(current.activeDogId, other.id);
});
test('interpretations use observable cues and escalate visible health concerns', () => {
  assert.equal(suggestions(['Tail held low'], observation.context)?.includes('uncertainty'), true);
  assert.ok(suggestions(['Sudden limp, collapse, or visible injury'], observation.context)?.includes('veterinarian'));
  assert.equal(suggestions(['Tail wagging loosely'], observation.context), null);
});
test('future observation times are rejected even when native form validation is bypassed', () => {
  assert.equal(validateObservation({ ...observation, occurredAt: '2026-11-11T10:05' }, new Date('2026-11-11T10:00')), null);
  assert.match(validateObservation({ ...observation, occurredAt: '2027-01-01T12:00' }, new Date('2026-11-11T10:00')) ?? '', /future/);
});

test('invalid or unconsented media observations cannot save', () => {
  assert.ok(validateObservation({ ...observation, cues: [] }));
  assert.ok(validateObservation({ ...observation, context: { ...observation.context, notes: '' } }));
  assert.ok(validateObservation({ ...observation, hasMedia: true }));
  assert.equal(validateObservation({ ...observation, hasMedia: true, mediaConsent: true }), null);
});
test('the complete original seed set does not appear as user data after migration', () => {
  const migrated = migrateState(null, JSON.stringify({ version: 1, activePetId: 'pet_1',
    pets: [{ id: 'pet_1', species: 'dog', name: 'Mochi', breed: 'Golden Retriever' }, { id: 'pet_3', species: 'dog', name: 'Barnaby', breed: 'French Bulldog' }, { id: 'pet_2', species: 'cat', name: 'Luna' }],
    moodEntries: [{ id: 'mood_1', petId: 'pet_1', notes: 'Seed', tags: [] }] }));
  assert.equal(migrated.dogs.length, 0);
  assert.equal(migrated.observations.length, 0);
});

test('user-created dog notes migrate without seed history; neutral observations remain exportable', () => {
  const migrated = migrateState(null, JSON.stringify({ version: 1, activePetId: 'mine', pets: [{ id: 'mine', species: 'dog', name: 'Scout', breed: 'Mixed' }],
    moodEntries: [{ id: 'mine-note', petId: 'mine', notes: 'Paced after a delivery.', tags: ['Door'] }] }));
  assert.equal(migrated.dogs[0].name, 'Scout');
  assert.equal(migrated.observations[0].context.activity, 'Door');
  assert.equal(migrated.observations[0].legacyMigrated, true);
  const saved = reducer(migrated, { type: 'saveObservation', observation: { ...observation, petId: 'mine', cues: ['Tail wagging loosely'] } });
  assert.equal(saved.observations[0].interpretation, null);
  assert.ok(exportJournal(saved).includes('Tail wagging loosely'));
  assert.ok(exportJournal(saved).includes('Paced after a delivery.'));
});

test('an explicitly initialized empty journal never reloads old seed data', () => {
  const old = JSON.stringify({ version: 1, activePetId: 'pet_1', pets: [{ id: 'pet_1', species: 'dog', name: 'Mochi', breed: 'Golden Retriever' }], moodEntries: [] });
  assert.equal(migrateState(null, old, true).dogs.length, 0);
  assert.equal(migrateState(null, old, false).dogs.length, 0);
});