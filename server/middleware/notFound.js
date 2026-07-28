// Catch-all for unmatched routes. Register after all route handlers,
// before the error handler.

export function notFound(req, res, next) {
  res.status(404).json({ error: `Route not found: ${req.originalUrl}` });
}

export default notFound;
