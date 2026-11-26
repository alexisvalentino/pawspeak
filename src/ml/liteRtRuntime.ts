let runtimePromise: Promise<typeof import('@litertjs/core')> | null = null;

/** LiteRT.js owns one global WASM runtime used by the pose model. */
export function getLiteRtRuntime(): Promise<typeof import('@litertjs/core')> {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const runtime = await import('@litertjs/core');
      const relaxedSimd = await runtime.supportsFeature('relaxedSimd').catch(() => false);
      const runtimeFile = relaxedSimd ? 'litert_wasm_internal.js' : 'litert_wasm_compat_internal.js';
      await runtime.loadLiteRt(`/litert-wasm/${runtimeFile}`);
      return runtime;
    })().catch(error => {
      runtimePromise = null;
      throw error;
    });
  }
  return runtimePromise;
}
