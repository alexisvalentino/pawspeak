export interface DogProfile {
  id: string;
  name: string;
  breed: string;
  birthdate?: string;
  notes?: string;
}

export const BODY_CUES = [
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
export type BodyCue = typeof BODY_CUES[number];

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
  dogs: DogProfile[];
  activeDogId: string | null;
  observations: Observation[];
}