import { BODY_LANGUAGE } from '../data/bodyLanguage';
import { createDetectorHealth, planDetectorRecovery } from './detectionPipeline';
import { detectPetsNatively, detectSceneNatively } from './nativePetDetector';

export type PetKind = 'dog' | 'cat';
/** Animal labels available in the COCO-SSD model bundled by TensorFlow.js. */
export type AnimalKind = PetKind | 'bird' | 'horse' | 'sheep' | 'cow' | 'elephant' | 'bear' | 'zebra' | 'giraffe';
export interface PetDetection {
  pet: AnimalKind;
  confidence: number;
  bbox: [number, number, number, number];
}
export interface BehaviorCandidate {
  label: string;
  score: number;
}
export interface BehaviorResult {
  status: 'ready' | 'unclear';
  modelVersion: string;
  candidates: BehaviorCandidate[];
}
export interface BehaviorClassifier {
  classify(input: HTMLCanvasElement, pet: PetKind): Promise<BehaviorResult>;
}
export interface ClassifierManifest {
  modelUrl: string;
  modelVersion: string;
  inputSize: number;
  outputMode: 'multi-label-sigmoid';
  labels: { dog: string[]; cat: string[] };
  threshold?: number;
  thresholds?: Record<string, number>;
  validation: {
    datasetVersion: string;
    evaluatedAt: string;
    heldOutAnimals: true;
    perCue: Record<string, { precision: number; recall: number; calibrationError: number }>;
  };
}

export interface SceneObject { label: string; confidence: number }
export interface SceneDetections { pets: PetDetection[]; otherObjects: SceneObject[] }
interface DetectorService {
  detect(input: HTMLCanvasElement | HTMLVideoElement, maxNumBoxes?: number, minScore?: number): Promise<PetDetection[]>;
  detectScene(input: HTMLCanvasElement | HTMLVideoElement, maxNumBoxes?: number, minScore?: number): Promise<SceneDetections>;
}
export type DetectorBackend = 'webgl' | 'cpu';

/** Try the graphics backend first, then the portable CPU backend if model setup fails. */
export async function loadDetectorWithBackendFallback<T>(
  backendApi: { setBackend: (backend: DetectorBackend) => Promise<boolean>; ready: () => Promise<void> },
  loadModel: () => Promise<T>,
  preferredBackend: DetectorBackend = 'webgl',
): Promise<{ backend: DetectorBackend; model: T }> {
  const backends: DetectorBackend[] = preferredBackend === 'cpu' ? ['cpu'] : ['webgl', 'cpu'];
  let lastError: unknown;
  for (const backend of backends) {
    try {
      if (!await backendApi.setBackend(backend)) throw new Error(`The ${backend} inference backend is unavailable.`);
      await backendApi.ready();
      return { backend, model: await loadModel() };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('No supported inference backend could load the pet detector.');
}
const MAX_DETECTOR_INPUT_SIDE = 640;

function detectorInput(source: HTMLCanvasElement | HTMLVideoElement) {
  const width = 'videoWidth' in source ? source.videoWidth : source.width;
  const height = 'videoHeight' in source ? source.videoHeight : source.height;
  const scale = Math.min(1, MAX_DETECTOR_INPUT_SIDE / Math.max(width, height));
  if (!width || !height || scale === 1) return { input: source, scaleX: 1, scaleY: 1 };

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  if (!context) return { input: source, scaleX: 1, scaleY: 1 };
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return { input: canvas, scaleX: width / canvas.width, scaleY: height / canvas.height };
}

export function scalePetDetectionsToSource(detections: PetDetection[], scaleX: number, scaleY: number): PetDetection[] {
  if (scaleX === 1 && scaleY === 1) return detections;
  return detections.map(pet => ({
    ...pet,
    bbox: [pet.bbox[0] * scaleX, pet.bbox[1] * scaleY, pet.bbox[2] * scaleX, pet.bbox[3] * scaleY],
  }));
}

function restoreDetectionSize(scene: SceneDetections, scaleX: number, scaleY: number): SceneDetections {
  return { ...scene, pets: scalePetDetectionsToSource(scene.pets, scaleX, scaleY) };
}

const ANIMAL_CLASSES = new Set<AnimalKind>(['dog', 'cat', 'bird', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe']);
const DETECTOR_ASSET_VERSION = '2';

export function petDetectionsFromPredictions(predictions: { class: string; score: number; bbox: [number, number, number, number] }[]): PetDetection[] {
  return predictions
    .filter((prediction): prediction is typeof prediction & { class: AnimalKind } => ANIMAL_CLASSES.has(prediction.class as AnimalKind))
    .map(prediction => ({ pet: prediction.class, confidence: prediction.score, bbox: prediction.bbox }))
    .sort((a, b) => b.confidence - a.confidence);
}

export function sceneDetectionsFromPredictions(predictions: { class: string; score: number; bbox: [number, number, number, number] }[]): SceneDetections {
  return {
    pets: petDetectionsFromPredictions(predictions),
    otherObjects: predictions.filter(prediction => !ANIMAL_CLASSES.has(prediction.class as AnimalKind))
      .map(prediction => ({ label: prediction.class, confidence: prediction.score }))
      .sort((a, b) => b.confidence - a.confidence).slice(0, 2)
  };
}
export function parseBehaviorManifest(value: unknown): ClassifierManifest {
  const manifest = value as ClassifierManifest;
  if (!manifest?.modelUrl || !manifest.modelVersion || !Number.isInteger(manifest.inputSize)
    || manifest.outputMode !== 'multi-label-sigmoid'
    || !Array.isArray(manifest.labels?.dog) || !Array.isArray(manifest.labels?.cat)
    || !manifest.labels.dog.length || !manifest.labels.cat.length
    || !manifest.validation?.datasetVersion || !manifest.validation.evaluatedAt || manifest.validation.heldOutAnimals !== true) {
    throw new Error('The behavior model manifest is invalid.');
  }
  for (const species of ['dog', 'cat'] as const) {
    if (new Set(manifest.labels[species]).size !== manifest.labels[species].length
      || manifest.labels[species].some(id => !BODY_LANGUAGE.some(entry => entry.id === id && entry.species === species))) {
      throw new Error(`The behavior model manifest contains a ${species} cue that is not in PawSpeak's dictionary.`);
    }
  }
  const cues = [...manifest.labels.dog, ...manifest.labels.cat];
  for (const cue of cues) {
    const metrics = manifest.validation.perCue?.[cue];
    if (!metrics || ![metrics.precision, metrics.recall, metrics.calibrationError].every(value => Number.isFinite(value) && value >= 0 && value <= 1)) {
      throw new Error(`The behavior model manifest is missing valid held-out evaluation for ${cue}.`);
    }
  }
  for (const [label, threshold] of Object.entries(manifest.thresholds ?? {})) {
    if (!label || !Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
      throw new Error('The behavior model manifest contains an invalid cue threshold.');
    }
  }
  if (manifest.threshold !== undefined && (!Number.isFinite(manifest.threshold) || manifest.threshold < 0 || manifest.threshold > 1)) {
    throw new Error('The behavior model manifest contains an invalid default threshold.');
  }
  return manifest;
}

let detectorPromise: Promise<DetectorService> | null = null;
let behaviorPromise: Promise<BehaviorClassifier | null> | null = null;

/** COCO-SSD detects common COCO animals. It cannot infer posture, emotion, or intent. */
async function getDetectorService(): Promise<DetectorService> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const [tf, coco] = await Promise.all([import('@tensorflow/tfjs'), import('@tensorflow-models/coco-ssd')]);
      const loadModel = () => coco.load({
        base: 'lite_mobilenet_v2',
        modelUrl: `/models/coco-ssd/model.json?v=${DETECTOR_ASSET_VERSION}`,
      });
      const loaded = await loadDetectorWithBackendFallback(tf, loadModel);
      let model = loaded.model;
      let health = createDetectorHealth(loaded.backend);
      let rebuilding: Promise<void> | null = null;

      const rebuild = async (backend: DetectorBackend) => {
        if (!rebuilding) {
          rebuilding = (async () => {
            const previous = model;
            const next = await loadDetectorWithBackendFallback(tf, loadModel, backend);
            model = next.model;
            health = { ...health, backend: next.backend };
            try { previous.dispose(); } catch { /* A lost GPU context can already be gone. */ }
          })().finally(() => { rebuilding = null; });
        }
        await rebuilding;
      };

      /**
       * Infer one frame. Every failure is recoverable: the loop retries, escalates to
       * the CPU backend, and rebuilds the model only when a GPU context was lost.
       */
      const detect = async (input: HTMLCanvasElement | HTMLVideoElement, maxNumBoxes: number, minScore: number) => {
        const before = health;
        try {
          const predictions = await model.detect(input, maxNumBoxes, minScore);
          if (health.consecutiveFailures > 0) health = { ...health, consecutiveFailures: 0, totalFailures: health.totalFailures };
          return predictions;
        } catch (error) {
          const step = planDetectorRecovery(before, error);
          health = step.health;
          if (step.reloadModel) {
            try { await rebuild(step.backend); } catch { /* keep the existing model and retry below */ }
          }
          const predictions = await model.detect(input, maxNumBoxes, minScore);
          health = { ...health, consecutiveFailures: 0 };
          return predictions;
        }
      };
      const service: DetectorService = {
        async detectScene(source: HTMLCanvasElement | HTMLVideoElement, maxNumBoxes = 8, minScore = 0.4) {
          const prepared = detectorInput(source);
          const predictions = await detect(prepared.input, maxNumBoxes, minScore);
          return restoreDetectionSize(sceneDetectionsFromPredictions(predictions), prepared.scaleX, prepared.scaleY);
        },
        async detect(source: HTMLCanvasElement | HTMLVideoElement, maxNumBoxes = 8, minScore = 0.4) {
          return (await service.detectScene(source, maxNumBoxes, minScore)).pets;
        }
      };
      return service;
    })().catch(error => { detectorPromise = null; throw error; });
  }
  return detectorPromise;
}
/**
 * Detect animals in one video frame.
 *
 * On the Android app this uses the native TFLite detector, which keeps a single
 * inference context and does not depend on a WebView WebGL context surviving between
 * frames. Everywhere else — and if the native plugin is missing — it falls back to
 * the bundled TensorFlow.js COCO-SSD model.
 */
export async function detectPets(input: HTMLCanvasElement | HTMLVideoElement): Promise<PetDetection[]> {
  if (input instanceof HTMLVideoElement) {
    try {
      const native = await detectPetsNatively(input);
      if (native) return native;
    } catch (error) {
      // A native failure must not stop live detection; fall through to the web model.
      console.warn('[PawSpeak] Native detector unavailable; using the web detector', error);
    }
  }
  return (await getDetectorService()).detect(input);
}
export async function detectScene(input: HTMLCanvasElement | HTMLVideoElement): Promise<SceneDetections> {
  // Captured photos and uploads take the native path on Android too, which also avoids
  // paying the WebGL-context teardown that COCO-SSD performs on every inference.
  if (input instanceof HTMLCanvasElement) {
    try {
      const native = await detectSceneNatively(input);
      if (native) return native;
    } catch (error) {
      console.warn('[PawSpeak] Native detector unavailable; using the web detector', error);
    }
  }
  return (await getDetectorService()).detectScene(input);
}

/**
 * Optional TF.js Layers image classifier. A model is enabled only when its own
 * posture-label manifest and model artifact exist; no breed detector is reused.
 */
export async function getBehaviorClassifier(): Promise<BehaviorClassifier | null> {
  if (!behaviorPromise) {
    behaviorPromise = (async () => {
      const response = await fetch('/models/behavior/manifest.json');
      if (response.status === 404 || !response.headers.get('content-type')?.includes('application/json')) return null;
      if (!response.ok) throw new Error('The behavior model manifest could not be loaded.');
      const manifest = parseBehaviorManifest(await response.json());
      const tf = await import('@tensorflow/tfjs');
      await tf.ready();
      const model = await tf.loadLayersModel(manifest.modelUrl);
      return {
        async classify(input: HTMLCanvasElement, pet: PetKind): Promise<BehaviorResult> {
          const pixels = tf.browser.fromPixels(input) as import('@tensorflow/tfjs').Tensor3D;
          const values = tf.tidy(() => tf.image.resizeBilinear(pixels, [manifest.inputSize, manifest.inputSize]).toFloat().div(255).expandDims(0)) as import('@tensorflow/tfjs').Tensor4D;
          try {
            const output = model.predict(values) as import('@tensorflow/tfjs').Tensor;
            const scores = Array.from(await output.data());
            output.dispose();
            const labels = manifest.labels[pet];
            if (scores.length !== labels.length) return { status: 'unclear', modelVersion: manifest.modelVersion, candidates: [] };
            const candidates = scores.map((score, index) => ({
              label: labels[index], score
            })).filter(candidate => Number.isFinite(candidate.score) && candidate.score >= 0 && candidate.score <= 1
              && candidate.score >= (manifest.thresholds?.[candidate.label] ?? manifest.threshold ?? 0.65))
              .sort((a, b) => b.score - a.score).slice(0, 3);
            return candidates.length > 0
              ? { status: 'ready', modelVersion: manifest.modelVersion, candidates }
              : { status: 'unclear', modelVersion: manifest.modelVersion, candidates: [] };
          } finally { values.dispose(); pixels.dispose(); }
        }
      };
    })().catch(error => { behaviorPromise = null; throw error; });
  }
  return behaviorPromise;
}

/** Test-only release of cached model loaders; does not download or mutate user data. */
export function resetClassifierCacheForTests() { detectorPromise = null; behaviorPromise = null; }
