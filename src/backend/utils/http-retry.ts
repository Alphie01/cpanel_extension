/* Retry-with-backoff + a small per-key concurrency limiter used by the WHM
 * client to be resilient and to avoid hammering a single host. `sleep` is
 * injectable so tests run instantly and deterministically. */

export interface RetryOptions {
  retries: number;
  baseBackoffMs: number;
  isRetryable: (err: unknown) => boolean;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export async function retry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T> {
  const sleep = opts.sleep ?? defaultSleep;
  const random = opts.random ?? Math.random;
  let attempt = 0;
  // First try + `retries` additional attempts.
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= opts.retries || !opts.isRetryable(err)) {
        throw err;
      }
      const backoff = opts.baseBackoffMs * 2 ** attempt;
      const jitter = Math.floor(random() * opts.baseBackoffMs);
      await sleep(backoff + jitter);
      attempt += 1;
    }
  }
}

/** Caps concurrent operations per key (e.g. per WHM host). */
export class KeyedConcurrencyLimiter {
  private readonly active = new Map<string, number>();
  private readonly queues = new Map<string, Array<() => void>>();

  constructor(private readonly maxConcurrent: number) {}

  async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    await this.acquire(key);
    try {
      return await fn();
    } finally {
      this.release(key);
    }
  }

  private async acquire(key: string): Promise<void> {
    const current = this.active.get(key) ?? 0;
    if (current < this.maxConcurrent) {
      this.active.set(key, current + 1);
      return;
    }
    await new Promise<void>((resolve) => {
      const queue = this.queues.get(key) ?? [];
      queue.push(resolve);
      this.queues.set(key, queue);
    });
    this.active.set(key, (this.active.get(key) ?? 0) + 1);
  }

  private release(key: string): void {
    this.active.set(key, Math.max(0, (this.active.get(key) ?? 1) - 1));
    const queue = this.queues.get(key);
    const next = queue?.shift();
    if (next) next();
  }
}
