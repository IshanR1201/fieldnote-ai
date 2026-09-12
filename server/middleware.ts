import type { NextFunction, Request, Response } from 'express';

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(self)');
  next();
}

/** Rejects cross-site form posts, which is the only CSRF vector for these JSON routes. */
export function requireJsonContentType(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'POST') {
    next();
    return;
  }
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('application/json')) {
    res.status(415).json({ error: 'Content-Type must be application/json.' });
    return;
  }
  next();
}

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * In-memory per-IP limiter. Retrieval and ingestion both spend embedding calls,
 * so an unthrottled client could burn the API quota.
 */
export function rateLimit(options: { windowMs: number; max: number; message: string }) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > options.max) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      res.status(429).json({ error: options.message });
      return;
    }
    next();
  };
}

export function jsonErrorHandler(err: unknown, _req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    next(err);
    return;
  }
  const status = (err as { status?: number; statusCode?: number })?.status
    ?? (err as { statusCode?: number })?.statusCode;
  if (status === 400 || (err as { type?: string })?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Request body could not be parsed as JSON.' });
    return;
  }
  if ((err as { type?: string })?.type === 'entity.too.large') {
    res.status(413).json({ error: 'Request body is too large.' });
    return;
  }
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Unexpected server error.' });
}
