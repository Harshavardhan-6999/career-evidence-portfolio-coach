/**
 * 404 Route Not Found Middleware
 */

export function notFoundHandler(req, res, next) {
  return res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} not found`
    }
  });
}
