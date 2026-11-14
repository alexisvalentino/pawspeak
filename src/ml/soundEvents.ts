export const SOUND_EVENT_MODEL_URL = '/models/sound-event/yamnet.tflite';
export const SOUND_EVENT_SAMPLE_RATE = 16_000;
export const SOUND_EVENT_CLASS_COUNT = 521;

/** Selected AudioSet class IDs from Google's YAMNet class map. */
export const SOUND_EVENT_LABELS: Readonly<Record<number, string>> = Object.freeze({
  70: 'Bark',
  72: 'Howl',
  74: 'Growling',
  75: 'Dog whimper',
  77: 'Purring',
  78: 'Meow',
  80: 'Caterwaul',
});

/** YAMNet scores are event scores, not calibrated probabilities or emotion estimates. */
export interface SoundEventCandidate {
  label: string;
  score: number;
}

const MIN_SOUND_EVENT_SCORE = 0.2;

/** Aggregate each selected event by its strongest YAMNet window and keep conservative candidates. */
export function decodeSoundEvents(scores: ArrayLike<number>, frameCount: number): SoundEventCandidate[] {
  if (!Number.isInteger(frameCount) || frameCount <= 0 || scores.length !== frameCount * SOUND_EVENT_CLASS_COUNT) return [];
  const candidates: SoundEventCandidate[] = [];
  for (const [indexText, label] of Object.entries(SOUND_EVENT_LABELS)) {
    const classIndex = Number(indexText);
    let strongest = 0;
    for (let frame = 0; frame < frameCount; frame += 1) {
      const score = scores[frame * SOUND_EVENT_CLASS_COUNT + classIndex];
      if (!Number.isFinite(score) || score < 0 || score > 1) return [];
      strongest = Math.max(strongest, score);
    }
    if (strongest >= MIN_SOUND_EVENT_SCORE) candidates.push({ label, score: strongest });
  }
  return candidates.sort((a, b) => b.score - a.score).slice(0, 3);
}
