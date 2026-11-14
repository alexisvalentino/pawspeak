import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

const CORE_MODEL_FILES = [
  '/models/coco-ssd/model.json',
  '/models/coco-ssd/group1-shard1of5',
  '/models/coco-ssd/group1-shard2of5',
  '/models/coco-ssd/group1-shard3of5',
  '/models/coco-ssd/group1-shard4of5',
  '/models/coco-ssd/group1-shard5of5',
];
const OPTIONAL_MODEL_FILES = [
  '/models/animal-pose/rtm_animal_fp16.tflite',
  '/models/sound-event/yamnet.tflite',
];
const MODEL_FILES = [...CORE_MODEL_FILES, ...OPTIONAL_MODEL_FILES];
const LITERT_RUNTIME_FILES = [
  '/litert-wasm/litert_wasm_internal.js',
  '/litert-wasm/litert_wasm_internal.wasm',
  '/litert-wasm/litert_wasm_compat_internal.js',
  '/litert-wasm/litert_wasm_compat_internal.wasm',
];
const PUBLIC_ASSETS = [
  '/manifest.webmanifest',
  '/favicon.ico',
  '/pawspeak-icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/icons/apple-touch-icon-120.png',
  '/icons/apple-touch-icon-152.png',
  '/icons/apple-touch-icon-167.png',
  '/icons/apple-touch-icon-180.png',
  ...MODEL_FILES,
  '/models/animal-pose/README.md',
  '/models/sound-event/README.md',
  ...LITERT_RUNTIME_FILES,
];

function offlineAppShell(): Plugin {
  return {
    name: 'pawspeak-offline-app-shell',
    apply: 'build',
    generateBundle(_options, bundle) {
      const builtFiles = Object.keys(bundle)
        .filter(fileName => !fileName.endsWith('.map') && fileName !== 'sw.js')
        .map(fileName => `/${fileName}`);
      const shellUrls = [...new Set([
        '/', '/index.html', '/manifest.webmanifest', '/favicon.ico', '/pawspeak-icon.svg',
        '/icons/icon-192.png', '/icons/icon-512.png',
        '/icons/apple-touch-icon-120.png', '/icons/apple-touch-icon-152.png',
        '/icons/apple-touch-icon-167.png', '/icons/apple-touch-icon-180.png',
        '/icons/icon-512-maskable.png',
        ...builtFiles,
      ])];
      const publicAssets = new Map(PUBLIC_ASSETS.map(fileName => [
        fileName,
        readFileSync(path.resolve(import.meta.dirname, 'public', fileName.slice(1))),
      ]));
      const expectedAssetSizes = Object.fromEntries(
        [...publicAssets].map(([fileName, source]) => [fileName, source.byteLength]),
      );
      for (const [fileName, source] of publicAssets) {
        this.emitFile({
          type: 'asset',
          fileName: fileName.slice(1),
          source,
        });
      }
      const shellHash = createHash('sha256');
      for (const fileName of shellUrls) {
        shellHash.update(fileName);
        const outputName = fileName.slice(1);
        const built = bundle[outputName];
        if (built) shellHash.update(built.type === 'chunk' ? built.code : built.source);
        else if (!MODEL_FILES.includes(fileName)) shellHash.update(publicAssets.get(fileName) ?? '');
      }
      const modelHash = createHash('sha256');
      for (const fileName of [...MODEL_FILES, ...LITERT_RUNTIME_FILES]) modelHash.update(publicAssets.get(fileName) ?? '');
      const shellCache = `pawspeak-app-shell-${shellHash.digest('hex').slice(0, 16)}`;
      const modelCache = `pawspeak-model-${modelHash.digest('hex').slice(0, 16)}`;
      const source = `
const SHELL_CACHE = ${JSON.stringify(shellCache)};
const MODEL_CACHE = ${JSON.stringify(modelCache)};
const SHELL_URLS = ${JSON.stringify(shellUrls)};
const MODEL_URLS = ${JSON.stringify(MODEL_FILES)};
const CORE_MODEL_URLS = ${JSON.stringify(CORE_MODEL_FILES)};
const RUNTIME_URLS = ${JSON.stringify(LITERT_RUNTIME_FILES)};
const EXPECTED_ASSET_SIZES = ${JSON.stringify(expectedAssetSizes)};
const SHELL_CREATED_AT = '/__pawspeak_shell_created_at__';
async function hasExpectedAssetSize(response, assetUrl) {
  const expected = EXPECTED_ASSET_SIZES[assetUrl];
  if (expected === undefined || !response.ok) return false;
  const contentLength = response.headers.get('content-length');
  if (contentLength && !response.headers.has('content-encoding')) {
    return Number(contentLength) === expected;
  }
  return (await response.clone().arrayBuffer()).byteLength === expected;
}
async function getValidCachedAsset(cache, assetUrl) {
  const cached = await cache.match(assetUrl, { ignoreSearch: true });
  if (!cached) return null;
  if (await hasExpectedAssetSize(cached, assetUrl)) return cached;
  await cache.delete(assetUrl, { ignoreSearch: true });
  return null;
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    try {
      const shell = await caches.open(SHELL_CACHE);
      await shell.addAll(SHELL_URLS);
      await shell.put(SHELL_CREATED_AT, new Response(String(Date.now())));
      const model = await caches.open(MODEL_CACHE);
      for (const url of CORE_MODEL_URLS) {
        if (await getValidCachedAsset(model, url)) continue;
        const response = await fetch(url);
        if (!await hasExpectedAssetSize(response, url)) {
          throw new Error('A bundled pet detector asset has an unexpected size.');
        }
        await model.put(url, response);
      }
      await self.skipWaiting();
    } catch (error) {
      await caches.delete(SHELL_CACHE);
      throw error;
    }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    const shells = await Promise.all(names.filter(name => name.startsWith('pawspeak-app-shell-')).map(async name => {
      const cache = await caches.open(name);
      const created = await cache.match(SHELL_CREATED_AT);
      return { name, createdAt: created ? Number(await created.text()) : 0 };
    }));
    shells.sort((a, b) => b.createdAt - a.createdAt);
    const retainedShells = new Set([SHELL_CACHE, ...shells.filter(shell => shell.name !== SHELL_CACHE).slice(0, 1).map(shell => shell.name)]);
    await Promise.all(names.filter(name => name.startsWith('pawspeak-app-shell-') && !retainedShells.has(name) || name.startsWith('pawspeak-model-') && name !== MODEL_CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(caches.open(SHELL_CACHE).then(cache => cache.match('/index.html').then(response => response || fetch(request))));
    return;
  }
  if (MODEL_URLS.includes(url.pathname) || RUNTIME_URLS.includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(MODEL_CACHE);
      const cached = await getValidCachedAsset(cache, url.pathname);
      if (cached) return cached;
      const response = await fetch(request);
      if (!await hasExpectedAssetSize(response, url.pathname)) {
        return new Response('PawSpeak model asset ' + url.pathname + ' is missing or incomplete.', {
          status: 502,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
      await cache.put(request, response.clone());
      return response;
    })());
    return;
  }
  if (!SHELL_URLS.includes(url.pathname)) {
    if (!url.pathname.startsWith('/assets/')) return;
    event.respondWith((async () => {
      const oldShells = (await caches.keys()).filter(name => name.startsWith('pawspeak-app-shell-') && name !== SHELL_CACHE);
      for (const name of oldShells) {
        const response = await (await caches.open(name)).match(request, { ignoreSearch: true });
        if (response) return response;
      }
      return fetch(request);
    })());
    return;
  }
  event.respondWith(caches.open(SHELL_CACHE).then(cache => cache.match(request, { ignoreSearch: true }).then(response => response || fetch(request))));
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), offlineAppShell()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: { copyPublicDir: false },
    server: {
      // Set DISABLE_HMR=true in constrained environments that cannot support file watching.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
