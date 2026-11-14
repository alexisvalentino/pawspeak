import type { PetDetection } from './petClassifier';

export interface PetTrack extends PetDetection {
  id: number;
  missedFrames: number;
}

export interface PetTrackState {
  tracks: PetTrack[];
  nextId: number;
}

export interface ProjectedBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

const BOX_SMOOTHING = 0.5;
const MAX_MISSED_FRAMES = 1;

function intersectionOverUnion(a: PetDetection['bbox'], b: PetDetection['bbox']): number {
  const left = Math.max(a[0], b[0]);
  const top = Math.max(a[1], b[1]);
  const right = Math.min(a[0] + a[2], b[0] + b[2]);
  const bottom = Math.min(a[1] + a[3], b[1] + b[3]);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const union = a[2] * a[3] + b[2] * b[3] - intersection;
  return union > 0 ? intersection / union : 0;
}

function matchScore(a: PetDetection['bbox'], b: PetDetection['bbox']): number | null {
  const overlap = intersectionOverUnion(a, b);
  const centerAX = a[0] + a[2] / 2;
  const centerAY = a[1] + a[3] / 2;
  const centerBX = b[0] + b[2] / 2;
  const centerBY = b[1] + b[3] / 2;
  const radius = Math.max(1, (Math.hypot(a[2], a[3]) + Math.hypot(b[2], b[3])) / 2);
  const distanceRatio = Math.hypot(centerAX - centerBX, centerAY - centerBY) / radius;

  if (overlap < 0.05 && distanceRatio > 0.8) return null;
  return overlap + Math.max(0, 1 - distanceRatio) * 0.25;
}

/** Match nearby detections of the same species and smooth box jitter between inference passes. */
export function updatePetTracks(state: PetTrackState, detections: PetDetection[]): PetTrackState {
  const possibleMatches: Array<{ trackIndex: number; detectionIndex: number; score: number }> = [];
  state.tracks.forEach((track, trackIndex) => detections.forEach((detection, detectionIndex) => {
    if (track.pet !== detection.pet) return;
    const score = matchScore(track.bbox, detection.bbox);
    if (score !== null) possibleMatches.push({ trackIndex, detectionIndex, score });
  }));
  possibleMatches.sort((a, b) => b.score - a.score);

  const matchedTracks = new Set<number>();
  const matchedDetections = new Set<number>();
  const nextTracks: PetTrack[] = [];
  for (const match of possibleMatches) {
    if (matchedTracks.has(match.trackIndex) || matchedDetections.has(match.detectionIndex)) continue;
    matchedTracks.add(match.trackIndex);
    matchedDetections.add(match.detectionIndex);
    const previous = state.tracks[match.trackIndex];
    const detection = detections[match.detectionIndex];
    nextTracks.push({
      ...detection,
      id: previous.id,
      missedFrames: 0,
      bbox: detection.bbox.map((value, index) => previous.bbox[index] * (1 - BOX_SMOOTHING) + value * BOX_SMOOTHING) as PetDetection['bbox'],
    });
  }

  let nextId = state.nextId;
  detections.forEach((detection, detectionIndex) => {
    if (!matchedDetections.has(detectionIndex)) nextTracks.push({ ...detection, id: nextId++, missedFrames: 0 });
  });

  state.tracks.forEach((track, trackIndex) => {
    if (matchedTracks.has(trackIndex)) return;
    const missedFrames = track.missedFrames + 1;
    if (missedFrames <= MAX_MISSED_FRAMES) nextTracks.push({ ...track, missedFrames });
  });

  nextTracks.sort((a, b) => a.id - b.id);
  return { tracks: nextTracks, nextId };
}

/** Project a video-space detection into an object-fit: cover preview and clip it to the visible frame. */
export function projectBoxToCover(
  bbox: PetDetection['bbox'], sourceWidth: number, sourceHeight: number, displayWidth: number, displayHeight: number,
): ProjectedBox | null {
  if (sourceWidth <= 0 || sourceHeight <= 0 || displayWidth <= 0 || displayHeight <= 0) return null;
  const scale = Math.max(displayWidth / sourceWidth, displayHeight / sourceHeight);
  const offsetX = (displayWidth - sourceWidth * scale) / 2;
  const offsetY = (displayHeight - sourceHeight * scale) / 2;
  const left = Math.max(0, Math.min(displayWidth, bbox[0] * scale + offsetX));
  const top = Math.max(0, Math.min(displayHeight, bbox[1] * scale + offsetY));
  const right = Math.max(0, Math.min(displayWidth, (bbox[0] + bbox[2]) * scale + offsetX));
  const bottom = Math.max(0, Math.min(displayHeight, (bbox[1] + bbox[3]) * scale + offsetY));
  if (right <= left || bottom <= top) return null;
  return {
    left: left / displayWidth * 100,
    top: top / displayHeight * 100,
    width: (right - left) / displayWidth * 100,
    height: (bottom - top) / displayHeight * 100,
  };
}

export function createPetTrackState(): PetTrackState {
  return { tracks: [], nextId: 1 };
}
