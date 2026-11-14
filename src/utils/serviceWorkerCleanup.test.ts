import assert from 'node:assert/strict';
import test from 'node:test';
import { removeDevelopmentOfflineCache } from './serviceWorkerCleanup';

function fakes(options: { registrations?: number; controlled?: boolean; cacheNames?: string[] } = {}) {
  const unregistered: number[] = [];
  const deleted: string[] = [];
  const registrations = Array.from({ length: options.registrations ?? 0 }, (_, index) => ({
    unregister: async () => { unregistered.push(index); return true; },
  }));
  const container = {
    controller: options.controlled ? {} : null,
    getRegistrations: async () => registrations,
  };
  const cacheStorage = {
    keys: async () => options.cacheNames ?? [],
    delete: async (name: string) => { deleted.push(name); return true; },
  };
  return { container, cacheStorage, unregistered, deleted };
}

test('development removes a stale production service worker that would serve an old bundle', async () => {
  const { container, cacheStorage, unregistered, deleted } = fakes({
    registrations: 1,
    controlled: true,
    cacheNames: ['pawspeak-app-shell-abc', 'pawspeak-model-def', 'someone-else'],
  });
  const result = await removeDevelopmentOfflineCache(container, cacheStorage);
  assert.deepEqual(unregistered, [0]);
  assert.deepEqual(deleted, ['pawspeak-app-shell-abc', 'pawspeak-model-def']);
  assert.equal(result.reloadRequired, true, 'a controlled page is still running the cached build and must reload');
});

test('development cleanup is a no-op without a service worker or stale caches', async () => {
  const { container, cacheStorage, unregistered, deleted } = fakes();
  assert.deepEqual(await removeDevelopmentOfflineCache(container, cacheStorage), { reloadRequired: false });
  assert.deepEqual(unregistered, []);
  assert.deepEqual(deleted, []);
  assert.deepEqual(await removeDevelopmentOfflineCache(undefined, undefined), { reloadRequired: false });
});
