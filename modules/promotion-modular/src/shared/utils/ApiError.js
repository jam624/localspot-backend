/**
 * Operational error carrying an HTTP status code. Throw this from any
 * service function and it'll be caught by catchAsync + the global error
 * handler, so controllers stay free of status-code logic.
 *
 * Usage: throw new ApiError(404, 'Promotion not found');
 */
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
