import {
  ANIMAL_POSE_INPUT_SIZE,
  ANIMAL_POSE_MODEL_URL,
  ANIMAL_POSE_MODEL_VERSION,
  classifyPoseSignals,
  createPoseCropRect,
  decodeAnimalPose,
  preprocessPoseRgba,
  type AnimalKeypoint,
  type VisiblePoseSignal,
} from './animalPose';
import type { PetDetection } from './petClassifier';
import { getLiteRtRuntime } from './liteRtRuntime';

export interface AnimalPoseAnalysis {
  status: 'ready' | 'unclear';
  signal: VisiblePoseSignal;
  modelVersion: string;
  points: AnimalKeypoint[];
}

export interface AnimalPoseEstimator {
  estimate(input: HTMLCanvasElement, animal: PetDetection): Promise<AnimalPoseAnalysis>;
}

interface AnimalPoseModel {
  run(input: import('@litertjs/core').Tensor): Promise<import('@litertjs/core').Tensor[]>;
  getInputDetails(): readonly { shape: ArrayLike<number> }[];
  getOutputDetails(): readonly { shape: ArrayLike<number> }[];
  delete(): void;
}

interface LoadedAnimalPoseModel {
  runtime: typeof import('@litertjs/core');
  model: AnimalPoseModel;
  accelerator: 'webgpu' | 'wasm';
}

let modelPromise: Promise<LoadedAnimalPoseModel> | null = null;
let estimatorPromise: Promise<AnimalPoseEstimator> | null = null;

function validateModel(model: AnimalPoseModel) {
  const input = model.getInputDetails()[0]?.shape;
  const outputs = model.getOutputDetails().map(output => output.shape);
  if (!input || Array.from(input).join(',') !== '1,3,256,256'
    || outputs.length < 2 || Array.from(outputs[0]).join(',') !== '1,17,512' || Array.from(outputs[1]).join(',') !== '1,17,512') {
    model.delete();
    throw new Error('The installed animal-pose model has an unexpected input or output shape.');
  }
}

async function loadModel() {
  const runtime = await getLiteRtRuntime();

  let model: AnimalPoseModel;
  let accelerator: LoadedAnimalPoseModel['accelerator'];
  if (runtime.isWebGPUSupported()) {
    try {
      model = await runtime.loadAndCompile(ANIMAL_POSE_MODEL_URL, { accelerator: 'webgpu' });
      accelerator = 'webgpu';
    } catch (gpuError) {
      console.warn('[PawSpeak] Animal pose WebGPU setup failed; retrying with LiteRT WASM.', gpuError);
      model = await runtime.loadAndCompile(ANIMAL_POSE_MODEL_URL, { accelerator: 'wasm' });
      accelerator = 'wasm';
    }
  } else {
    model = await runtime.loadAndCompile(ANIMAL_POSE_MODEL_URL, { accelerator: 'wasm' });
    accelerator = 'wasm';
  }

  validateModel(model);
  return { runtime, model, accelerator };
}

async function getModel() {
  if (!modelPromise) {
    modelPromise = loadModel().catch(error => { modelPromise = null; throw error; });
  }
  return modelPromise;
}

async function runWithBackendFallback(loaded: LoadedAnimalPoseModel, input: import('@litertjs/core').Tensor) {
  try {
    return await loaded.model.run(input);
  } catch (error) {
    if (loaded.accelerator !== 'webgpu') {
      loaded.model.delete();
      modelPromise = null;
      throw error;
    }

    loaded.model.delete();
    try {
      const model = await loaded.runtime.loadAndCompile(ANIMAL_POSE_MODEL_URL, { accelerator: 'wasm' });
      validateModel(model);
      const fallback = { ...loaded, model, accelerator: 'wasm' as const };
      modelPromise = Promise.resolve(fallback);
      console.warn('[PawSpeak] Animal pose WebGPU inference failed; switched to LiteRT WASM.', error);
      return await model.run(input);
    } catch (fallbackError) {
      modelPromise = null;
      throw fallbackError;
    }
  }
}

function makeSquareInput(source: HTMLCanvasElement, animal: PetDetection) {
  const rect = createPoseCropRect(source.width, source.height, animal.bbox);
  if (!rect) return null;

  const canvas = document.createElement('canvas');
  canvas.width = ANIMAL_POSE_INPUT_SIZE;
  canvas.height = ANIMAL_POSE_INPUT_SIZE;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  const scale = canvas.width / rect.size;
  context.fillStyle = 'rgb(124,116,104)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, -rect.x * scale, -rect.y * scale, source.width * scale, source.height * scale);
  return { canvas, rect, pixels: context.getImageData(0, 0, canvas.width, canvas.height) };
}

export async function getAnimalPoseEstimator(): Promise<AnimalPoseEstimator> {
  if (!estimatorPromise) {
    estimatorPromise = (async () => ({
      async estimate(input: HTMLCanvasElement, animal: PetDetection): Promise<AnimalPoseAnalysis> {
        const crop = makeSquareInput(input, animal);
        if (!crop) return { status: 'unclear', signal: 'unclear', modelVersion: ANIMAL_POSE_MODEL_VERSION, points: [] };

        const { runtime, model } = await getModel();
        const values = preprocessPoseRgba(crop.pixels.data, crop.canvas.width, crop.canvas.height);
        const tensor = new runtime.Tensor(values, [1, 3, ANIMAL_POSE_INPUT_SIZE, ANIMAL_POSE_INPUT_SIZE]);
        let outputs: import('@litertjs/core').Tensor[] = [];
        try {
          outputs = await runWithBackendFallback(await getModel(), tensor);
          if (outputs.length < 2) return { status: 'unclear', signal: 'unclear', modelVersion: ANIMAL_POSE_MODEL_VERSION, points: [] };
          const [xScores, yScores] = await Promise.all([outputs[0].data(), outputs[1].data()]);
          const pose = decodeAnimalPose(xScores, yScores);
          if (!pose) return { status: 'unclear', signal: 'unclear', modelVersion: ANIMAL_POSE_MODEL_VERSION, points: [] };

          const signal = classifyPoseSignals(pose.points);
          const points = pose.points.map(point => ({
            ...point,
            x: crop.rect.x + point.x / ANIMAL_POSE_INPUT_SIZE * crop.rect.size,
            y: crop.rect.y + point.y / ANIMAL_POSE_INPUT_SIZE * crop.rect.size,
          }));
          return { status: signal === 'unclear' ? 'unclear' : 'ready', signal, modelVersion: pose.version, points };
        } finally {
          tensor.delete();
          outputs.forEach(output => output.delete());
        }
      },
    }))();
  }
  return estimatorPromise;
}

export function resetAnimalPoseCacheForTests() {
  estimatorPromise = null;
  if (modelPromise) void modelPromise.then(({ model }) => model.delete()).catch(() => {});
  modelPromise = null;
}

