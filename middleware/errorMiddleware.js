// middleware/errorMiddleware.js

/**
 * 404 Not Found middleware
 * Creates an error and passes it to the error handler
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

/**
 * Global error handler
 * Handles all errors and sends appropriate status & message
 */
const errorHandler = (err, req, res, next) => {
  // ✅ Status resolution order:
  //   1. err.status / err.statusCode — explicit, set by the throwing code
  //   2. res.statusCode — set via res.status(x) BEFORE the throw (the
  //      pattern used throughout this codebase: `res.status(401); throw new Error(...)`).
  //      Express defaults res.statusCode to 200 until something sets it,
  //      so if it's anything other than 200 here, that was a deliberate
  //      res.status(x) call upstream and must be honoured — otherwise
  //      EVERY controller using that pattern silently becomes a 500.
  //   3. 500 — true fallback for genuinely unclassified errors.
  let statusCode =
    err.status ||
    err.statusCode ||
    (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || 'Something went wrong';

  // ✅ Mongoose bad ObjectId
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // ✅ Mongoose duplicate key error (e.g., duplicate email)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`;
  }

  // ✅ Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
  }

  // ✅ JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please login again.';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired. Please login again.';
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

export { notFound, errorHandler };