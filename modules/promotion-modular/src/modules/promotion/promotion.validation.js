const ApiError = require('../../shared/utils/ApiError');

/**
 * Minimal manual validation so the module has zero required dependencies.
 * Swap this out for express-validator/zod/joi if your project already
 * uses one — the interface (middleware that calls next() or throws) stays
 * the same either way.
 */
function validateCreate(req, res, next) {
  const { title, description, startDate, endDate } = req.body;
  const errors = [];

  if (!title || typeof title !== 'string' || !title.trim()) errors.push('title is required');
  if (!description || typeof description !== 'string' || !description.trim()) errors.push('description is required');
  if (!startDate || isNaN(Date.parse(startDate))) errors.push('startDate must be a valid date');
  if (!endDate || isNaN(Date.parse(endDate))) errors.push('endDate must be a valid date');
  if (startDate && endDate && !errors.length && new Date(endDate) <= new Date(startDate)) {
    errors.push('endDate must be after startDate');
  }

  if (errors.length) return next(new ApiError(400, errors.join('; ')));
  next();
}

function validateUpdate(req, res, next) {
  const { title, description, startDate, endDate } = req.body;
  const errors = [];

  if (title !== undefined && (typeof title !== 'string' || !title.trim())) errors.push('title cannot be empty');
  if (description !== undefined && (typeof description !== 'string' || !description.trim())) errors.push('description cannot be empty');
  if (startDate !== undefined && isNaN(Date.parse(startDate))) errors.push('startDate must be a valid date');
  if (endDate !== undefined && isNaN(Date.parse(endDate))) errors.push('endDate must be a valid date');
  if (startDate && endDate && !errors.length && new Date(endDate) <= new Date(startDate)) {
    errors.push('endDate must be after startDate');
  }

  if (errors.length) return next(new ApiError(400, errors.join('; ')));
  next();
}

module.exports = { validateCreate, validateUpdate };
