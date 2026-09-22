const ApiError = require('../utils/ApiError');

/**
 * Single global error handler. Any ApiError thrown from a service gets its
 * status/message passed straight through; anything else (a bug, a driver
 * error) is logged and returned as a generic 500 so internals never leak.
 */
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  console.error(err); // wire this into your real logger
  res.status(500).json({ error: 'Something went wrong' });
}

module.exports = errorHandler;
