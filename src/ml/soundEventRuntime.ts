import {
  SOUND_EVENT_CLASS_COUNT,
  SOUND_EVENT_MODEL_URL,
  SOUND_EVENT_SAMPLE_RATE,
  decodeSoundEvents,
  type SoundEventCandidate,
} from './soundEvents';
import { getLiteRtRuntime } from './liteRtRuntime';

interface SoundEventModel {
  run(input: import('@litertjs/core').Tensor): Promise<import('@litertjs/core').Tensor[]>;
  getInputDetails(): readonly { shape: ArrayLike<number> }[];
  getOutputDetails(): readonly { shape: ArrayLike<number> }[];
  delete(): void;
}

export interface SoundEventClassifier {
  classify(waveform: Float32Array): Promise<SoundEventCandidate[]>;
}

let classifierPromise: Promise<SoundEventClassifier> | null = null;

async function loadClassifier(): Promise<SoundEventClassifier> {
  const runtime = await getLiteRtRuntime();
  const model: SoundEventModel = await runtime.loadAndCompile(SOUND_EVENT_MODEL_URL, { accelerator: 'wasm' });
  const input = model.getInputDetails()[0]?.shape;
  const outputs = model.getOutputDetails().map(output => Array.from(output.shape));
  if (!input || Array.from(input).length !== 1 || outputs.length < 1
    || outputs[0].at(-1) !== SOUND_EVENT_CLASS_COUNT) {
    model.delete();
    throw new Error('The installed sound-event model has an unexpected input or output shape.');
  }

  return {
    async classify(waveform) {
      if (waveform.length < SOUND_EVENT_SAMPLE_RATE || waveform.some(value => !Number.isFinite(value))) return [];
      const tensor = new runtime.Tensor(waveform, [waveform.length]);
      let outputs: import('@litertjs/core').Tensor[] = [];
      try {
        outputs = await model.run(tensor);
        if (!outputs[0]) return [];
        const values = await outputs[0].data();
        if (values.length % SOUND_EVENT_CLASS_COUNT !== 0) return [];
        return decodeSoundEvents(values, values.length / SOUND_EVENT_CLASS_COUNT);
      } finally {
        tensor.delete();
        outputs.forEach(output => output.delete());
      }
    },
  };
}

export function getSoundEventClassifier(): Promise<SoundEventClassifier> {
  if (!classifierPromise) classifierPromise = loadClassifier().catch(error => { classifierPromise = null; throw error; });
  return classifierPromise;
}

export function resetSoundEventClassifierForTests() {
  classifierPromise = null;
}
