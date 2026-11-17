export type PetSpecies = 'dog' | 'cat';

export interface PetProfile {
  id: string;
  name: string;
  species: PetSpecies;
  breed: string;
  birthdate?: string;
  notes?: string;
}

/** Accepted when reading older v2 journals that did not store a species. */
export type DogProfile = Omit<PetProfile, 'species'> & { species?: PetSpecies };

export const DOG_BODY_CUES = [
  'Relaxed, loose body',
  'Lowered body or shifted weight back',
  'Play bow: front down, rear up',
  'Tail held low',
  'Tail wagging loosely',
  'Pacing or repeated circling',
  'Turning away or avoiding contact',
  'Lip licking or repeated yawning',
  'Repeated barking or whining',
  'Rigid posture or prolonged staring',
  'Sudden limp, collapse, or visible injury',
] as const;

export const CAT_BODY_CUES = [
  'Relaxed, loose body',
  'Crouched low or shifted weight back',
  'Ears turned sideways or flattened',
  'Tail held close, tucked, or puffed',
  'Tail flicking or lashing',
  'Soft eyes or slow blinking',
  'Turning away, hiding, or seeking distance',
  'Lip licking or repeated yawning',
  'Pacing or repeated circling',
  'Hissing, growling, or repeated vocalizing',
  'Rigid posture or prolonged staring',
  'Sudden limp, collapse, or visible injury',
] as const;

export const BODY_CUES = [...DOG_BODY_CUES, ...CAT_BODY_CUES] as const;
export type BodyCue = typeof BODY_CUES[number];

export function cuesForSpecies(species: PetSpecies): readonly BodyCue[] {
  return species === 'cat' ? CAT_BODY_CUES : DOG_BODY_CUES;
}

export interface ObservationContext {
  activity: string;
  environment: string;
  nearby: string;
  recentEvent: string;
  notes: string;
}

export interface Observation {
  id: string;
  petId: string;
  createdAt: string;
  occurredAt: string;
  cues: BodyCue[];
  context: ObservationContext;
  interpretation: string | null;
  mediaConsent: boolean;
  hasMedia: boolean;
  legacyMigrated?: boolean;
}

export interface JournalState {
  version: 2;
  dogs: PetProfile[];
  activeDogId: string | null;
  observations: Observation[];
}
