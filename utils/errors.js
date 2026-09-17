/**
 * Shared HTTP error factories.
 * Each function creates an Error with a statusCode property
 * that the global error handler in app.js reads.
 */

export function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

export function unauthorized(message) {
  const error = new Error(message);
  error.statusCode = 401;
  return error;
}

export function forbidden(message) {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
}

export function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

export function conflict(message) {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
}
