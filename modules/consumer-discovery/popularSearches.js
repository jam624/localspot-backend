/**
 * Drop this file into modules/consumer-discovery/
 * Then import and register in discovery.routes.js (see patch instructions).
 */

import { query } from "../../config/db.js";

function toNum(v) { return Number(v ?? 0); }

// GET /api/v1/discovery/popular-searches
export async function getPopularSearches(req, res, next) {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));

    const rows = await query(
      `SELECT search_query, COUNT(*) AS count
       FROM events
       WHERE event_type = 'search'
         AND search_query IS NOT NULL
         AND search_query != ''
         AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY search_query
       ORDER BY count DESC
       LIMIT ?`,
      [limit]
    );

    return res.status(200).json({
      data: rows.map((r) => ({ query: r.search_query, count: toNum(r.count) })),
    });
  } catch (e) { return next(e); }
}
