// Shared HTTP error helpers for services. Each returns a plain Error
// with a `.status` property, which the centralized error handler
// middleware reads. Kept here so new services don't each redefine
// their own copy of this pattern.

function makeError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export const badRequest = (message) => makeError(400, message);
export const unauthorized = (message) => makeError(401, message);
export const forbidden = (message) => makeError(403, message);
export const notFound = (message) => makeError(404, message);
export const conflict = (message) => makeError(409, message);
export const methodNotAllowed = (message) => makeError(405, message);
