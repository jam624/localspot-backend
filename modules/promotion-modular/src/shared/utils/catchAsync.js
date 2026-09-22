/**
 * Wraps an async route handler so rejected promises are forwarded to
 * Express's error middleware instead of needing try/catch in every
 * controller function.
 *
 * Usage: router.get('/', catchAsync(controller.listPublic));
 */
module.exports = function catchAsync(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
