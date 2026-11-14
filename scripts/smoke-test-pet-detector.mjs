import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const coco = require('@tensorflow-models/coco-ssd');
const tf = require('@tensorflow/tfjs-core');
const tfconv = require('@tensorflow/tfjs-converter');
require('@tensorflow/tfjs-backend-cpu');

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modelDirectory = path.join(projectRoot, 'public', 'models', 'coco-ssd');
const modelJson = JSON.parse(await readFile(path.join(modelDirectory, 'model.json'), 'utf8'));
const weightGroups = modelJson.weightsManifest;
const paths = weightGroups.flatMap(group => group.paths);
const specs = weightGroups.flatMap(group => group.weights);
const shards = await Promise.all(paths.map(file => readFile(path.join(modelDirectory, file))));
const totalBytes = shards.reduce((total, shard) => total + shard.byteLength, 0);
const joinedWeights = new Uint8Array(totalBytes);
let byteOffset = 0;
for (const shard of shards) {
  joinedWeights.set(shard, byteOffset);
  byteOffset += shard.byteLength;
}

await tf.setBackend('cpu');
await tf.ready();
const graph = await tfconv.loadGraphModel(tf.io.fromMemory({
  modelTopology: modelJson.modelTopology,
  weightSpecs: specs,
  weightData: joinedWeights.buffer,
}));
const detector = new coco.ObjectDetection('lite_mobilenet_v2', 'in-memory');
detector.model = graph;

try {
  for (const [species, filename] of [['dog', 'dog-test.jpg'], ['cat', 'cat-test.jpg']]) {
    const imagePath = path.join(projectRoot, 'docs', 'qa', 'camera-20261112', filename);
    const { data, info } = await sharp(imagePath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const image = tf.tensor3d(new Uint8Array(data), [info.height, info.width, info.channels], 'int32');
    try {
      const detections = await detector.detect(image, 8, 0.4);
      const pet = detections.find(detection => detection.class === species);
      assert.ok(pet, `The bundled model did not find the ${species} in ${filename}.`);
      console.log(`${species}: detected at ${(pet.score * 100).toFixed(1)}% confidence using CPU.`);
    } finally {
      image.dispose();
    }
  }
} finally {
  detector.dispose();
}
