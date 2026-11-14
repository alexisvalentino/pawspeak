import { BODY_LANGUAGE_DATA } from './bodyLanguageData';
import type { PetKind } from '../ml/petClassifier';

export type { PetKind } from '../ml/petClassifier';

export interface BodyLanguageSource {
  number: number;
  citation: string;
  url: string;
}

export interface RelatedCue {
  name: string;
  id: string;
}

export interface BodyLanguageEntry {
  id: string;
  species: PetKind;
  name: string;
  cueType: string;
  status: 'Safe' | 'Caution' | 'Stop';
  confidence: number;
  evidenceSummary: string;
  plainWords: string;
  whatItCanMean: string;
  context: string;
  whatToDo: string;
  related: RelatedCue[];
  notes: string;
  sources: BodyLanguageSource[];
}

export const EVIDENCE_SCALE = [
  { score: '10', meaning: 'Several peer-reviewed studies agree, plus vet/behaviorist consensus' },
  { score: '8-9', meaning: 'At least one solid peer-reviewed study, consistent with vet/behaviorist guidance' },
  { score: '6-7', meaning: 'Vet org / vet school / board-certified behaviorist guidance, little direct research' },
  { score: '4-5', meaning: 'Mixed or conflicting findings; meaning depends heavily on context' },
  { score: '2-3', meaning: 'Weak or anecdotal support from a credible source; mostly expert opinion with caveats' },
  { score: '1', meaning: 'Popular belief that credible sources say is NOT supported (include only to correct the myth; the meaning must state the evidence)' },
] as const;

export const BODY_LANGUAGE = BODY_LANGUAGE_DATA;
