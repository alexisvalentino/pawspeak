import type { PetDetection } from './petClassifier';

export const ANIMAL_POSE_MODEL_URL = '/models/animal-pose/rtm_animal_fp16.tflite';
export const ANIMAL_POSE_MODEL_VERSION = 'rtmpose-animal-ap10k-litert-fp16';
export const ANIMAL_POSE_INPUT_SIZE = 256;
export const ANIMAL_POSE_KEYPOINT_NAMES = [
  'left-eye', 'right-eye', 'nose', 'neck', 'tail-root', 'left-shoulder', 'left-elbow', 'left-front-paw',
  'right-shoulder', 'right-elbow', 'right-front-paw', 'left-hip', 'left-knee', 'left-back-paw',
  'right-hip', 'right-knee', 'right-back-paw',
] as const;

export interface AnimalKeypoint {
  name: typeof ANIMAL_POSE_KEYPOINT_NAMES[number];
  x: number;
  y: number;
  /** Spatial distribution sharpness from SimCC, not a calibrated probability. */
  certainty: number;
}

export interface AnimalPose {
  version: string;
  points: AnimalKeypoint[];
}

export type VisiblePoseSignal = 'limbs-extended' | 'limbs-tucked' | 'unclear';

export interface PoseCropRect {
  x: number;
  y: number;
  size: number;
}

const SIMCC_BINS = ANIMAL_POSE_INPUT_SIZE * 2;
const MIN_POINT_SHARPNESS = 0.005;

function simccPeak(values: ArrayLike<number>, offset: number): { bin: number; probability: number } | null {
  let max = Number.NEGATIVE_INFINITY;
  let maxBin = -1;
  for (let i = 0; i < SIMCC_BINS; i += 1) {
    const value = values[offset + i];
    if (!Number.isFinite(value)) return null;
    if (value > max) { max = value; maxBin = i; }
  }
  if (maxBin < 0) return null;

  let total = 0;
  for (let i = 0; i < SIMCC_BINS; i += 1) total += Math.exp(values[offset + i] - max);
  const probability = 1 / total;
  return Number.isFinite(probability) ? { bin: maxBin, probability } : null;
}

/** Decode the x/y SimCC tensors produced by RTMPose-Animal AP-10K. */
export function decodeAnimalPose(xScores: ArrayLike<number>, yScores: ArrayLike<number>): AnimalPose | null {
  const expectedLength = ANIMAL_POSE_KEYPOINT_NAMES.length * SIMCC_BINS;
  if (xScores.length !== expectedLength || yScores.length !== expectedLength) return null;

  const points: AnimalKeypoint[] = [];
  for (let i = 0; i < ANIMAL_POSE_KEYPOINT_NAMES.length; i += 1) {
    const offset = i * SIMCC_BINS;
    const x = simccPeak(xScores, offset);
    const y = simccPeak(yScores, offset);
    if (!x || !y) return null;
    points.push({
      name: ANIMAL_POSE_KEYPOINT_NAMES[i],
      x: x.bin / 2,
      y: y.bin / 2,
      certainty: Math.sqrt(x.probability * y.probability),
    });
  }
  return { version: ANIMAL_POSE_MODEL_VERSION, points };
}

/** Report only limb geometry that is visible from a roughly side-on view. */
export function classifyPoseSignals(points: readonly AnimalKeypoint[]): VisiblePoseSignal {
  if (points.length !== ANIMAL_POSE_KEYPOINT_NAMES.length) return 'unclear';
  const required = [3, 4, 5, 7, 8, 10, 11, 13, 14, 16];
  if (required.some(index => !points[index] || points[index].certainty < MIN_POINT_SHARPNESS)) return 'unclear';

  const neck = points[3];
  const tailRoot = points[4];
  const torsoLength = Math.hypot(tailRoot.x - neck.x, tailRoot.y - neck.y);
  if (!Number.isFinite(torsoLength) || torsoLength < 12
    || Math.abs(tailRoot.y - neck.y) / torsoLength > 0.4) return 'unclear';

  const limbPairs = [[5, 7], [8, 10], [11, 13], [14, 16]] as const;
  const extension = limbPairs.reduce((sum, [proximal, paw]) =>
    sum + Math.abs(points[paw].y - points[proximal].y) / torsoLength, 0) / limbPairs.length;
  if (extension >= 0.32) return 'limbs-extended';
  if (extension <= 0.2) return 'limbs-tucked';
  return 'unclear';
}

/** Make a padded square crop around one detector box for the top-down pose model. */
export function createPoseCropRect(
  sourceWidth: number,
  sourceHeight: number,
  bbox: PetDetection['bbox'],
  margin = 1.16,
): PoseCropRect | null {
  if (![sourceWidth, sourceHeight, ...bbox, margin].every(Number.isFinite)
    || sourceWidth <= 0 || sourceHeight <= 0 || margin < 1) return null;
  const left = Math.max(0, Math.min(sourceWidth, bbox[0]));
  const top = Math.max(0, Math.min(sourceHeight, bbox[1]));
  const right = Math.max(0, Math.min(sourceWidth, bbox[0] + bbox[2]));
  const bottom = Math.max(0, Math.min(sourceHeight, bbox[1] + bbox[3]));
  if (right <= left || bottom <= top) return null;

  const size = Math.max(right - left, bottom - top) * margin;
  if (size <= 0) return null;
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  const x = centerX - size / 2;
  const y = centerY - size / 2;
  return { x, y, size };
}

/** Convert RGBA pixels from a 256px canvas into the model's normalized RGB NCHW tensor. */
export function preprocessPoseRgba(rgba: ArrayLike<number>, width: number, height: number): Float32Array {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0
    || rgba.length !== width * height * 4) throw new Error('Animal pose input pixels have an invalid size.');

  const plane = width * height;
  const result = new Float32Array(plane * 3);
  const means = [123.675, 116.28, 103.53];
  const standardDeviations = [58.395, 57.12, 57.375];
  for (let pixel = 0; pixel < plane; pixel += 1) {
    const rgbaOffset = pixel * 4;
    result[pixel] = (rgba[rgbaOffset] - means[0]) / standardDeviations[0];
    result[plane + pixel] = (rgba[rgbaOffset + 1] - means[1]) / standardDeviations[1];
    result[plane * 2 + pixel] = (rgba[rgbaOffset + 2] - means[2]) / standardDeviations[2];
  }
  return result;
}

