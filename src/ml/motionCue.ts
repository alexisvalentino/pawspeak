export interface MotionSample {
  time: number;
  bbox: [number, number, number, number];
}

/**
 * Detect a sustained change in a tracked animal's image position. This is an
 * observation of box movement only; camera motion can produce the same change.
 */
export function hasVisiblePositionChange(samples: readonly MotionSample[]): boolean {
  if (samples.length < 3) return false;
  const recent = samples.slice(-5);
  if (recent.some(sample => !Number.isFinite(sample.time) || !sample.bbox.every(Number.isFinite)
    || sample.bbox[2] <= 0 || sample.bbox[3] <= 0)) return false;
  if (recent.at(-1)!.time - recent[0].time < 1_400) return false;

  const first = recent[0].bbox;
  const last = recent.at(-1)!.bbox;
  const firstCenterX = first[0] + first[2] / 2;
  const firstCenterY = first[1] + first[3] / 2;
  const lastCenterX = last[0] + last[2] / 2;
  const lastCenterY = last[1] + last[3] / 2;
  const referenceSize = (Math.hypot(first[2], first[3]) + Math.hypot(last[2], last[3])) / 2;
  const normalizedTravel = Math.hypot(lastCenterX - firstCenterX, lastCenterY - firstCenterY) / referenceSize;
  return normalizedTravel >= 0.32;
}
