/**
 * Cat body-part grouping, adapted from the DeepCat approach
 * (Arwa-Fawzy/Cat-Emotional-Analysis, IEEE 79630).
 *
 * DeepCat runs a YOLOv8 model that detects four box types — tail, eyes, mouth and
 * ears — then applies OpenCV geometry per part (tail angle, eye white/black ratio)
 * and *heuristics* to name a mood. PawSpeak deliberately keeps the useful half
 * (part-level detection + a corroboration requirement) and drops the half that
 * cannot be defended: the threshold tables that turn a tail angle into "happy".
 *
 * Those thresholds have no published evaluation, derive mood from a single 2D
 * image, and would contradict PawSpeak's standing rule that the app never claims
 * to read emotion. So this module only ever reports *which parts are visible* and,
 * when two parts agree, a cautious posture observation with an explicit caveat.
 */

export const CAT_BODY_PARTS = ['ears', 'eyes', 'mouth', 'tail', 'body'] as const;
export type CatBodyPart = typeof CAT_BODY_PARTS[number];

export interface PartDetection {
  part: CatBodyPart;
  confidence: number;
  bbox: [number, number, number, number];
}

export interface BodyPartSummary {
  parts: PartDetection[];
  /** Parts present with a usable score, highest first. */
  visible: CatBodyPart[];
}

const PART_SET = new Set<string>(CAT_BODY_PARTS);

/**
 * Group raw detections into at most one box per body part.
 * The tail, for instance, is often detected several times; the strongest box wins.
 */
export function parseCatBodyPartDetections(raw: unknown): PartDetection[] {
  if (!Array.isArray(raw)) return [];
  const best = new Map<CatBodyPart, PartDetection>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const { label, confidence, bbox } = item as Record<string, unknown>;
    if (typeof label !== 'string' || !PART_SET.has(label)) continue;
    if (typeof confidence !== 'number' || !Number.isFinite(confidence)) continue;
    if (!Array.isArray(bbox) || bbox.length !== 4 || !bbox.every(value => typeof value === 'number' && Number.isFinite(value))) continue;
    const part = label as CatBodyPart;
    const previous = best.get(part);
    if (!previous || confidence > previous.confidence) {
      best.set(part, { part, confidence, bbox: bbox as [number, number, number, number] });
    }
  }
  return [...best.values()].sort((a, b) => b.confidence - a.confidence);
}

export function aggregateBodyParts(detections: PartDetection[]): BodyPartSummary {
  return { parts: detections, visible: detections.map(item => item.part) };
}

export interface PostureCue {
  label: string;
  confidence: number;
  caveat: string;
  supportingParts: CatBodyPart[];
}

/**
 * A single body part is never enough. DeepCat picks the first non-zero part in a
 * fixed priority list, which means one stray tail box silently becomes a verdict.
 * PawSpeak requires two corroborating parts and reports the *weaker* of the two.
 */
const CORROBORATING_PAIRS: Array<{ parts: [CatBodyPart, CatBodyPart]; label: string }> = [
  { parts: ['tail', 'eyes'], label: 'Tail and eyes are both visible in this frame' },
  { parts: ['tail', 'body'], label: 'Tail and body are both visible in this frame' },
  { parts: ['eyes', 'ears'], label: 'Eyes and ears are both visible in this frame' },
];

const CAVEAT = 'A still image cannot show movement, and no validated model maps these parts to a mood. Treat this as a photo-quality cue, not a reading.';

export function catCueFromBodyParts(summary: BodyPartSummary): PostureCue | null {
  if (summary.visible.length < 2) return null;
  const scoreOf = (part: CatBodyPart) => summary.parts.find(item => item.part === part)?.confidence ?? 0;
  for (const pair of CORROBORATING_PAIRS) {
    const [first, second] = pair.parts;
    if (!summary.visible.includes(first) || !summary.visible.includes(second)) continue;
    // Report the weaker evidence: agreement must never inflate confidence.
    return {
      label: pair.label,
      confidence: Math.min(scoreOf(first), scoreOf(second)),
      caveat: CAVEAT,
      supportingParts: [first, second],
    };
  }
  return null;
}
