/**
 * Lightweight request logger middleware for student debugging.
 */

export function requestLogger(req, res, next) {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLine = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`;
    console.log(logLine);
  });
  next();
}
