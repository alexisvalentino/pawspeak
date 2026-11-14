interface ServiceWorkerContainerLike {
  controller: unknown;
  getRegistrations(): Promise<readonly { unregister(): Promise<boolean> }[]>;
}
interface CacheStorageLike {
  keys(): Promise<string[]>;
  delete(name: string): Promise<boolean>;
}

/**
 * The production service worker answers navigations with its cached index.html.
 * If it is still installed on the dev origin, `npm run dev` keeps executing that old
 * build and source fixes never reach the browser. Remove it and PawSpeak's caches.
 */
export async function removeDevelopmentOfflineCache(
  container: ServiceWorkerContainerLike | undefined,
  cacheStorage: CacheStorageLike | undefined,
): Promise<{ reloadRequired: boolean }> {
  const controlled = !!container?.controller;
  const registrations = container ? await container.getRegistrations() : [];
  await Promise.all(registrations.map(registration => registration.unregister()));
  const names = cacheStorage ? await cacheStorage.keys() : [];
  await Promise.all(names.filter(name => name.startsWith('pawspeak-')).map(name => cacheStorage!.delete(name)));
  return { reloadRequired: controlled };
}
