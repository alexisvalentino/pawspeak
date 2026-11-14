import { Capacitor, registerPlugin } from '@capacitor/core';
import type { PetDetection, SceneDetections, SceneObject } from './petClassifier';

interface NativeDetection {
  label: string;
  confidence: number;
  bbox: [number, number, number, number];
}
interface PetDetectorPluginApi {
  isAvailable(): Promise<{ available: boolean }>;
  detect(options: { image: string }): Promise<{ detections: NativeDetection[] }>;
}

const PetDetectorNative = registerPlugin<PetDetectorPluginApi>('PetDetector');

const ANIMAL_CLASSES = new Set<string>(['dog', 'cat', 'bird', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe']);

let availability: Promise<boolean> | null = null;
let canvas: HTMLCanvasElement | null = null;

/** Native detection is only registered in the Android build of the app. */
export function nativeDetectorSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function resetNativeDetectorCacheForTests() {
  availability = null;
  canvas = null;
}

export async function isNativeDetectorAvailable(): Promise<boolean> {
  if (!nativeDetectorSupported()) return false;
  if (!availability) {
    availability = PetDetectorNative.isAvailable()
      .then(result => result.available)
      // A missing plugin must degrade to the web detector, never break the screen.
      .catch(() => false);
  }
  return availability;
}

/** Split native output into supported pets and everything else the model recognised. */
export function sceneFromNativeDetections(detections: NativeDetection[]): SceneDetections {
  const usable = detections.filter(item =>
    typeof item.label === 'string'
    && Number.isFinite(item.confidence)
    && Array.isArray(item.bbox)
    && item.bbox.length === 4
    && item.bbox.every(Number.isFinite));
  const pets: PetDetection[] = usable
    .filter(item => ANIMAL_CLASSES.has(item.label))
    .map(item => ({ pet: item.label as PetDetection['pet'], confidence: item.confidence, bbox: item.bbox }))
    .sort((a, b) => b.confidence - a.confidence);
  const otherObjects: SceneObject[] = usable
    .filter(item => !ANIMAL_CLASSES.has(item.label))
    .map(item => ({ label: item.label, confidence: item.confidence }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 2);
  return { pets, otherObjects };
}

/** Encode one video frame as base64 JPEG small enough to cross the native bridge cheaply. */
export function frameToJpeg(video: HTMLVideoElement, maxSide = 720): string | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
  const width = Math.max(1, Math.round(video.videoWidth * scale));
  const height = Math.max(1, Math.round(video.videoHeight * scale));
  if (!canvas) canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.drawImage(video, 0, 0, width, height);
  return stripDataUrl(canvas.toDataURL('image/jpeg', 0.72));
}

/** Encode an already-captured still (photo upload or capture) for native inference. */
export function canvasToJpeg(source: HTMLCanvasElement, maxSide = 1024): string | null {
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  if (scale === 1) return stripDataUrl(source.toDataURL('image/jpeg', 0.9));
  const scaled = document.createElement('canvas');
  scaled.width = width;
  scaled.height = height;
  const context = scaled.getContext('2d');
  if (!context) return null;
  context.drawImage(source, 0, 0, width, height);
  return stripDataUrl(scaled.toDataURL('image/jpeg', 0.9));
}

function stripDataUrl(dataUrl: string): string | null {
  const comma = dataUrl.indexOf(',');
  return comma === -1 ? null : dataUrl.slice(comma + 1);
}

async function detectEncoded(image: string | null): Promise<NativeDetection[] | null> {
  if (!image) return null;
  if (!await isNativeDetectorAvailable()) return null;
  const result = await PetDetectorNative.detect({ image });
  return result.detections;
}

/** Run native detection on a captured canvas; null means "use the web detector". */
export async function detectSceneNatively(source: HTMLCanvasElement): Promise<SceneDetections | null> {
  const detections = await detectEncoded(canvasToJpeg(source));
  return detections ? sceneFromNativeDetections(detections) : null;
}

/** Run native detection on one live video frame; null means "use the web detector". */
export async function detectPetsNatively(video: HTMLVideoElement): Promise<PetDetection[] | null> {
  const detections = await detectEncoded(frameToJpeg(video));
  return detections ? sceneFromNativeDetections(detections).pets : null;
}
