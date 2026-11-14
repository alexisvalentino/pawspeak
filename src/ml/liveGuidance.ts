import type { PetDetection } from './petClassifier';

export interface GuidanceCheck {
  id: 'light' | 'pet' | 'frame';
  label: string;
  detail: string;
  status: 'good' | 'warn' | 'pending';
}

export function buildLiveGuidance(detections: PetDetection[] | null, brightness: number | null, width: number, height: number): GuidanceCheck[] {
  const light: GuidanceCheck = brightness === null
    ? { id: 'light', label: 'Light', detail: 'Checking…', status: 'pending' }
    : brightness < 55
      ? { id: 'light', label: 'Light', detail: 'Add a little light', status: 'warn' }
      : brightness > 225
        ? { id: 'light', label: 'Light', detail: 'Reduce the glare', status: 'warn' }
        : { id: 'light', label: 'Light', detail: 'Looks good', status: 'good' };
  const pet: GuidanceCheck = detections === null
    ? { id: 'pet', label: 'Your pet', detail: 'Finding…', status: 'pending' }
    : detections.length === 0
      ? { id: 'pet', label: 'Animal', detail: 'Show one animal', status: 'warn' }
      : detections.length === 1
        ? { id: 'pet', label: 'Your pet', detail: 'In view!', status: 'good' }
        : { id: 'pet', label: 'Your pet', detail: 'One at a time', status: 'warn' };
  let frame: GuidanceCheck = { id: 'frame', label: 'Whole pet', detail: 'Checking…', status: 'pending' };
  if (detections?.length === 1 && width > 0 && height > 0) {
    const [x, y, w, h] = detections[0].bbox;
    if (x < width * 0.035 || y < height * 0.035 || x + w > width * 0.965 || y + h > height * 0.965) {
      frame = { id: 'frame', label: 'Whole pet', detail: 'Move back a little', status: 'warn' };
    } else if (w < width * 0.2 || h < height * 0.22) {
      frame = { id: 'frame', label: 'Whole pet', detail: 'Come a little closer', status: 'warn' };
    } else {
      frame = { id: 'frame', label: 'Whole pet', detail: 'Fits in the picture', status: 'good' };
    }
  }
  return [light, pet, frame];
}

export function sampleLuminance(video: HTMLVideoElement, canvas: HTMLCanvasElement): number | null {
  if (video.readyState < 2 || !video.videoWidth) return null;
  canvas.width = 32; canvas.height = 32;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(video, 0, 0, 32, 32);
  const pixels = context.getImageData(0, 0, 32, 32).data;
  let sum = 0;
  for (let i = 0; i < pixels.length; i += 4) sum += pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722;
  return sum / (pixels.length / 4);
}
