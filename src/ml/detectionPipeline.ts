import type { DetectorBackend } from './petClassifier';

/** A model rebuild is expensive on mobile GPUs, so allow only a few per session. */
export const MAX_MODEL_RELOADS = 3;
/** Failures on one backend before it is considered broken and swapped out. */
export const FAILURES_BEFORE_BACKEND_SWITCH = 2;

export interface DetectorHealth {
  backend: DetectorBackend;
  consecutiveFailures: number;
  /** True once the CPU backend has produced a successful inference. */
  lockedToCpu: boolean;
  reloads: number;
  totalFailures: number;
}

export function createDetectorHealth(backend: DetectorBackend): DetectorHealth {
  return { backend, consecutiveFailures: 0, lockedToCpu: backend === 'cpu', reloads: 0, totalFailures: 0 };
}

export interface RecoveryStep {
  health: DetectorHealth;
  backend: DetectorBackend;
  reloadModel: boolean;
  delayMs: number;
}

function isContextLoss(error: unknown): boolean {
  if (typeof error === 'string') return /webglcontextlost/i.test(error);
  if (typeof error !== 'object' || error === null) return false;
  const anyError = error as { message?: unknown; name?: unknown };
  const text = `${String(anyError.message ?? '')} ${String(anyError.name ?? '')}`;
  return /webglcontextlost|context lost|GL_OUT_OF_MEMORY|context_lost/i.test(text);
}

/**
 * Decide how to recover from a failed inference pass.
 *
 * COCO-SSD switches the tfjs backend to CPU for non-max suppression and back to
 * WebGL on every single `detect()` call. On mobile GPUs that repeated teardown can
 * fail after the first successful frame, which looked like "detection works once,
 * then errors". Recovery therefore escalates: retry, then fall back to the portable
 * CPU backend, and only rebuild the model when the GPU context was actually lost.
 */
export function planDetectorRecovery(health: DetectorHealth, error: unknown): RecoveryStep {
  const failures = health.consecutiveFailures + 1;
  const contextLost = isContextLoss(error);
  const switchToCpu = health.backend === 'webgl'
    && !health.lockedToCpu
    && (contextLost || failures >= FAILURES_BEFORE_BACKEND_SWITCH);
  const backend: DetectorBackend = switchToCpu ? 'cpu' : health.backend;
  const wantReload = contextLost
    ? health.reloads < MAX_MODEL_RELOADS
    : switchToCpu && health.reloads < MAX_MODEL_RELOADS;
  return {
    health: {
      backend,
      consecutiveFailures: failures,
      lockedToCpu: backend === 'cpu',
      reloads: wantReload ? health.reloads + 1 : health.reloads,
      totalFailures: health.totalFailures + 1,
    },
    backend,
    reloadModel: wantReload,
    delayMs: Math.min(5000, 250 * 2 ** Math.min(failures - 1, 5)),
  };
}
