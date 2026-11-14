/** How many consecutive failures are tolerated before the coach admits the detector is stuck. */
export const LIVE_RETRY_LIMIT = 3;

/** Failures that mean "no frame yet", not "the model is broken". */
const TRANSIENT_ERROR_NAMES = new Set([
  'InvalidStateError',
  'AbortError',
  'NotReadableError',
  'TimeoutError',
  'IndexSizeError',
]);

export interface LiveFailureDecision {
  /** The loop must always schedule another attempt; live detection must never latch to "off". */
  retry: true;
  consecutiveFailures: number;
  retryDelay: number;
  showUnavailable: boolean;
  transient: boolean;
}

/**
 * Decide how the live detector loop reacts to a failed frame.
 *
 * The loop used to `return` from its catch block, which permanently stopped
 * detection after a single error: the coach froze on "Your pet: Finding…" and
 * never recovered until the screen was remounted. A WebView can legitimately
 * throw once — a frame is not ready, the GPU context is rebuilt, the first model
 * load races the camera start — so every failure now schedules another attempt.
 */
export function decideLiveFailure(consecutiveFailures: number, error?: unknown): LiveFailureDecision {
  const name = typeof error === 'object' && error !== null && 'name' in error ? String((error as { name: unknown }).name) : '';
  const transient = TRANSIENT_ERROR_NAMES.has(name);
  const total = consecutiveFailures + 1;
  // 400ms, 800ms, 1600ms, ... capped so a recovered device resumes quickly.
  const retryDelay = Math.min(4000, 400 * 2 ** Math.min(total - 1, 4));
  return {
    retry: true,
    consecutiveFailures: total,
    retryDelay,
    showUnavailable: !transient && total >= LIVE_RETRY_LIMIT,
    transient,
  };
}
