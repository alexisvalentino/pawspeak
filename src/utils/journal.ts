import { BODY_CUES, BodyCue, DogProfile, JournalState, Observation, ObservationContext } from '../types/journal';

export const STORAGE_KEY = 'pawspeak.journal.v2';
export const LEGACY_KEY = 'pawspeak.state.v1';
export const INITIALIZED_KEY = 'pawspeak.journal.initialized';
export const createId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const toLocalInput = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};
export const formatObservationTime = (value: string) => new Date(`${value}:00`).toLocaleString();

export function suggestions(cues: BodyCue[], context: ObservationContext): string | null {
  const selected = new Set(cues);
  const text = Object.values(context).join(' ').toLowerCase();
  if (selected.has('Sudden limp, collapse, or visible injury')) {
    return 'Contact a veterinarian promptly for this observation. Sudden behavior change, collapse, or visible injury should not wait for app interpretation. Keep the dog safe and follow the clinic\'s advice.';
  }
  if (selected.has('Play bow: front down, rear up') && selected.has('Relaxed, loose body')) {
    return 'The play bow and loose body are consistent with a playful invitation in many dogs. Compare these cues with the other dog or person\'s response and stop if either becomes tense or tries to disengage.';
  }
  if (selected.has('Lowered body or shifted weight back') || selected.has('Turning away or avoiding contact')) {
    return 'These cues can occur with uncertainty or a wish to avoid interaction. Distance, recent events, and the rest of the body matter. Give space and do not approach, restrain, or force contact based on this observation.';
  }
  if (selected.has('Rigid posture or prolonged staring')) {
    return 'A rigid posture or fixed stare can be a signal to increase distance. It does not establish a cause or intention. Avoid approaching or handling the dog; contact a qualified behavior professional if this happens repeatedly.';
  }
  if (selected.has('Pacing or repeated circling')) {
    return text.includes('walk') || text.includes('dinner') || text.includes('visitor')
      ? 'Pacing can happen around anticipation, but can also reflect discomfort or other causes. Note what happens before and afterward and whether the dog can settle. If this is sudden or unusual, contact a veterinarian.'
      : 'Repeated pacing can have many causes; this record is not enough to identify one. Note the setting, duration, and what helps the dog settle. Seek veterinary advice if it is sudden, severe, or unusual.';
  }
  if (selected.has('Lip licking or repeated yawning') || selected.has('Tail held low')) {
    return 'This can occur during stress or uncertainty, but also in other situations. Consider recent handling, noise, unfamiliar people or animals, and whether the dog seeks space. One cue alone does not establish a mood.';
  }
  if (selected.has('Repeated barking or whining')) {
    return 'The sound may relate to attention, excitement, discomfort, or the environment. Record what happened before and after, and look for repeated patterns. Sound alone cannot identify the cause.';
  }
  if (selected.has('Tail wagging loosely') && selected.has('Relaxed, loose body')) {
    return 'A loose body and wag can occur during relaxed, friendly interaction. Tail wagging alone does not guarantee comfort; continue watching the whole body and whether the dog freely approaches.';
  }
  return null;
}

export function validateObservation(observation: Observation, now = new Date()): string | null {
  if (!observation.id || !observation.petId) return 'An observation must belong to a dog.';
  if (!observation.context.activity.trim() || !observation.context.environment.trim()) return 'Add the activity and setting to give this observation context.';
  if (!observation.context.notes.trim()) return 'Describe what happened before, during, and after the observation.';
  if (!Number.isFinite(Date.parse(observation.occurredAt))) return 'Use a valid observation date and time.';
  if (Date.parse(observation.occurredAt) > now.getTime() + 5 * 60 * 1000) return 'Observation time cannot be in the future.';
  if (observation.cues.length === 0) return 'Choose at least one observable cue.';
  if (observation.cues.some(cue => !BODY_CUES.includes(cue))) return 'Choose a supported observation cue.';
  if (observation.hasMedia && !observation.mediaConsent) return 'Consent is required to include media.';
  return null;
}

function validDog(value: unknown): value is DogProfile {
  const dog = value as DogProfile;
  return typeof dog?.id === 'string' && typeof dog.name === 'string' && dog.name.trim().length > 0
    && typeof dog.breed === 'string' && (!dog.birthdate || !Number.isNaN(Date.parse(dog.birthdate)));
}
function validObservation(value: unknown): value is Observation {
  const observation = value as Observation;
  if (typeof observation?.id !== 'string' || typeof observation.petId !== 'string' || !Array.isArray(observation.cues)
    || observation.cues.some(cue => !BODY_CUES.includes(cue)) || !observation.context || !Number.isFinite(Date.parse(observation.occurredAt))
    || typeof observation.context.activity !== 'string' || typeof observation.context.environment !== 'string'
    || typeof observation.context.notes !== 'string' || typeof observation.context.nearby !== 'string'
    || typeof observation.context.recentEvent !== 'string') return false;
  return !observation.hasMedia || observation.mediaConsent === true;
}

/** Migrate only user-entered journals, never seeded translation/XP/personality data. */
export function migrateState(raw: string | null, legacyRaw?: string | null, initialized = false): JournalState {
  const empty: JournalState = { version: 2, dogs: [], activeDogId: null, observations: [] };
  try {
    if (raw) {
      const value = JSON.parse(raw);
      if (value?.version === 2 && Array.isArray(value.dogs) && value.dogs.every(validDog)
        && Array.isArray(value.observations) && value.observations.every(validObservation)
        && value.observations.every((o: Observation) => value.dogs.some((d: DogProfile) => d.id === o.petId))) {
        const dogs = value.dogs.filter((d: DogProfile) => d.id !== 'demo-dog');
        const observations = value.observations.filter((o: Observation) => o.petId !== 'demo-dog' && o.id !== 'demo-observation');
        return { version: 2, dogs, observations, activeDogId: dogs.some((d: DogProfile) => d.id === value.activeDogId) ? value.activeDogId : dogs[0]?.id ?? null };
      }
      return empty;
    }
    if (!legacyRaw || initialized) return empty;
    const old = JSON.parse(legacyRaw);
    if (old?.version !== 1 || !Array.isArray(old.pets) || !Array.isArray(old.moodEntries)) return empty;
    const dogs = old.pets.filter((p: { species: string; id: string; name: string }) => p.species === 'dog' && p.id && p.name && !/^pet_[1-4]$/.test(p.id)).map((p: { id: string; name: string; breed: string }) => ({
      id: p.id, name: p.name, breed: typeof p.breed === 'string' ? p.breed : 'Not specified'
    }));
    const observations = old.moodEntries.filter((e: { id: string; petId: string; notes: string }) => !/^mood_\d+$/.test(e.id) && dogs.some((d: DogProfile) => d.id === e.petId) && typeof e.notes === 'string').map((e: { id: string; petId: string; notes: string; tags?: string[] }) => {
      const tags = e.tags?.length ? e.tags.join(', ') : 'Migrated observation';
      return { id: e.id, petId: e.petId, createdAt: new Date().toISOString(), occurredAt: toLocalInput(), cues: [],
        context: { activity: tags, environment: 'Not recorded', nearby: '', recentEvent: '', notes: e.notes },
        interpretation: null, mediaConsent: false, hasMedia: false, legacyMigrated: true };
    });
    return { version: 2, dogs, activeDogId: dogs.some((d: DogProfile) => d.id === old.activePetId) ? old.activePetId : dogs[0]?.id ?? null,
      observations };
  } catch { return empty; }
}

export function reducer(state: JournalState, action: { type: string; [key: string]: unknown }): JournalState {
  switch (action.type) {
    case 'saveDog': {
      const dog = action.dog as DogProfile;
      const dogs = state.dogs.some(d => d.id === dog.id) ? state.dogs.map(d => d.id === dog.id ? dog : d) : [...state.dogs, dog];
      return { ...state, dogs, activeDogId: state.activeDogId ?? dog.id };
    }
    case 'select': return state.dogs.some(d => d.id === action.id) ? { ...state, activeDogId: action.id as string } : state;
    case 'saveObservation': {
      const observation = action.observation as Observation;
      if (validateObservation(observation) || !state.dogs.some(d => d.id === observation.petId)) return state;
      const observations = state.observations.some(o => o.id === observation.id)
        ? state.observations.map(o => o.id === observation.id ? observation : o) : [observation, ...state.observations];
      return { ...state, observations };
    }
    case 'deleteObservation': return { ...state, observations: state.observations.filter(o => o.id !== action.id) };
    case 'deleteDog': {
      const dogs = state.dogs.filter(d => d.id !== action.id);
      return { ...state, dogs, observations: state.observations.filter(o => o.petId !== action.id), activeDogId: dogs[0]?.id ?? null };
    }
    case 'clear': return { version: 2, dogs: [], activeDogId: null, observations: [] };
    default: return state;
  }
}

export function exportJournal(state: JournalState): string {
  return JSON.stringify({ product: 'PawSpeak', exportedAt: new Date().toISOString(), dogs: state.dogs,
    observations: state.observations, limitations: ['User-recorded observations', 'Cue-based guidance, not model analysis', 'Raw media is not exported'] }, null, 2);
}

export function downloadJournal(state: JournalState): string {
  const link = document.createElement('a');
  link.href = `data:application/json;charset=utf-8,${encodeURIComponent(exportJournal(state))}`;
  link.download = `pawspeak-journal-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  return exportJournal(state);
}