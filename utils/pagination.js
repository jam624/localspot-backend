/**
 * Pagination helpers used across discovery and other modules.
 * Follows the project convention of simple exported utility functions.
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * Parses and sanitises pagination query parameters from req.query.
 *
 * @param {object} query - Express req.query
 * @returns {{ page: number, limit: number, offset: number }}
 */
export function parsePagination(query) {
  const rawPage = parseInt(query.page, 10);
  const rawLimit = parseInt(query.limit, 10);

  const page = Math.max(1, Number.isNaN(rawPage) ? 1 : rawPage);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.isNaN(rawLimit) ? DEFAULT_LIMIT : rawLimit)
  );
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Builds the meta object included in paginated API responses.
 *
 * @param {number} page
 * @param {number} limit
 * @param {number} total
 * @returns {{ page: number, limit: number, total: number, totalPages: number }}
 */
export function paginationMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
