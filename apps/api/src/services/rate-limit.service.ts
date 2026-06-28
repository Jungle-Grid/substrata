type BucketEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, BucketEntry>();

export function assertRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const bucket = buckets.get(input.key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(input.key, {
      count: 1,
      resetAt: now + input.windowMs,
    });
    return;
  }

  if (bucket.count >= input.limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((bucket.resetAt - now) / 1000),
    );
    const error = new Error('Too many requests. Try again later.');
    (error as Error & { retryAfterSeconds?: number }).retryAfterSeconds =
      retryAfterSeconds;
    throw error;
  }

  bucket.count += 1;
}
