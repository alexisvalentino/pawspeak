import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'node_modules', '@litertjs', 'core', 'wasm');
const destination = path.join(root, 'public', 'litert-wasm');
const files = [
  'litert_wasm_internal.js',
  'litert_wasm_internal.wasm',
  'litert_wasm_compat_internal.js',
  'litert_wasm_compat_internal.wasm',
];

await mkdir(destination, { recursive: true });
for (const file of files) await copyFile(path.join(source, file), path.join(destination, file));
console.log(`Prepared ${files.length} LiteRT.js runtime files for local and offline inference.`);
