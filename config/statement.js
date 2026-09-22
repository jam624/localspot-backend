// ---------------------------------------------------------------------------
// Business Account statements
// ---------------------------------------------------------------------------

export const businessAccountStatements = {
  findByEmail:
    "SELECT id, business_name, owner_name, email, phone, password_hash, status, email_verified_at, last_login_at, created_at FROM business_accounts WHERE email = ? LIMIT 1",

  findById:
    "SELECT id, business_name, owner_name, email, phone, status, email_verified_at, last_login_at, created_at FROM business_accounts WHERE id = ? LIMIT 1",

  findExisting:
    "SELECT id, email, phone FROM business_accounts WHERE email = ? OR phone = ? LIMIT 1",

  create:
    "INSERT INTO business_accounts (business_name, owner_name, email, phone, password_hash, status) VALUES (?, ?, ?, ?, ?, 'active')",

  updateLastLogin:
    "UPDATE business_accounts SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?",

  updatePassword:
    "UPDATE business_accounts SET password_hash = ? WHERE id = ?",
};

// ---------------------------------------------------------------------------
// Business (listing) statements
// ---------------------------------------------------------------------------

export const businessStatements = {
  createDraft:
    "INSERT INTO businesses (account_id, name, slug, email, phone, listing_status) VALUES (?, ?, ?, ?, ?, 'draft')",
};

// ---------------------------------------------------------------------------
// Admin statements
// ---------------------------------------------------------------------------

export const adminStatements = {
  findByEmail:
    "SELECT id, name, email, password_hash, role, is_active, last_login_at, created_at FROM admins WHERE email = ? LIMIT 1",

  findById:
    "SELECT id, name, email, role, is_active, last_login_at, created_at FROM admins WHERE id = ? LIMIT 1",

  updateLastLogin:
    "UPDATE admins SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?",

  updatePassword:
    "UPDATE admins SET password_hash = ? WHERE id = ?",
};

// ---------------------------------------------------------------------------
// Analytics statements
// ---------------------------------------------------------------------------

export const analyticsStatements = {
  // query: find business listing by account ID — params: account_id
  findBusinessByAccountId:
    "SELECT id, name, listing_status FROM businesses WHERE account_id = ? LIMIT 1",

  // query: all event counts for a business in a date window — params: business_id, start, end
  businessEventSummary: `
    SELECT
      COALESCE(SUM(event_type = 'business_view'), 0)            AS profile_views,
      COALESCE(SUM(event_type = 'search'), 0)                   AS search_appearances,
      COALESCE(SUM(event_type = 'favorite_add'), 0)             AS favorites,
      COALESCE(SUM(event_type = 'phone_click'), 0)              AS phone_clicks,
      COALESCE(SUM(event_type = 'whatsapp_click'), 0)           AS whatsapp_clicks,
      COALESCE(SUM(event_type = 'website_click'), 0)            AS website_clicks,
      COALESCE(SUM(event_type = 'directions_click'), 0)         AS direction_clicks,
      COALESCE(SUM(event_type = 'advertisement_impression'), 0) AS ad_impressions,
      COALESCE(SUM(event_type = 'advertisement_click'), 0)      AS ad_clicks
    FROM events
    WHERE business_id = ?
      AND created_at >= ?
      AND created_at <= ?
  `,

  // query: platform-wide event totals for a date window — params: start, end
  adminTrafficSummary: `
    SELECT
      COALESCE(SUM(event_type = 'business_view'), 0) AS profile_views,
      COALESCE(SUM(event_type = 'search'), 0)         AS total_searches,
      COUNT(*)                                         AS total_events
    FROM events
    WHERE created_at >= ? AND created_at <= ?
  `,

  // query: top 10 search queries by frequency — params: start, end
  adminPopularSearches: `
    SELECT search_query, COUNT(*) AS count
    FROM events
    WHERE event_type = 'search'
      AND search_query IS NOT NULL
      AND search_query <> ''
      AND created_at >= ?
      AND created_at <= ?
    GROUP BY search_query
    ORDER BY count DESC
    LIMIT 10
  `,

  // query: business counts (total, active, pending, new in period) — params: period_start
  adminBusinessStats: `
    SELECT
      COUNT(*)                                               AS total,
      COALESCE(SUM(listing_status = 'active'), 0)           AS active,
      COALESCE(SUM(listing_status = 'pending_approval'), 0) AS pending,
      COALESCE(SUM(created_at >= ?), 0)                     AS new_count
    FROM businesses
  `,

  // query: all businesses grouped by listing status — no params
  adminBusinessesByStatus: `
    SELECT listing_status, COUNT(*) AS count
    FROM businesses
    GROUP BY listing_status
  `,

  // query: top 10 businesses by profile view count — params: start, end
  adminMostViewedBusinesses: `
    SELECT b.id, b.name, b.slug, COUNT(e.id) AS view_count
    FROM businesses b
    JOIN events e ON e.business_id = b.id AND e.event_type = 'business_view'
    WHERE e.created_at >= ? AND e.created_at <= ?
    GROUP BY b.id, b.name, b.slug
    ORDER BY view_count DESC
    LIMIT 10
  `,

  // query: top 10 businesses by favorite count — params: start, end
  adminMostSavedBusinesses: `
    SELECT b.id, b.name, b.slug, COUNT(e.id) AS save_count
    FROM businesses b
    JOIN events e ON e.business_id = b.id AND e.event_type = 'favorite_add'
    WHERE e.created_at >= ? AND e.created_at <= ?
    GROUP BY b.id, b.name, b.slug
    ORDER BY save_count DESC
    LIMIT 10
  `,

  // query: top 10 categories by interaction volume — params: start, end
  adminCategoryTraffic: `
    SELECT c.id, c.name, c.slug, COUNT(e.id) AS event_count
    FROM categories c
    JOIN events e ON e.category_id = c.id
    WHERE e.created_at >= ? AND e.created_at <= ?
    GROUP BY c.id, c.name, c.slug
    ORDER BY event_count DESC
    LIMIT 10
  `,

  // query: most active areas and cities by interaction volume — params: start, end
  adminLocationStats: `
    SELECT b.area, b.city, COUNT(e.id) AS view_count
    FROM businesses b
    JOIN events e ON e.business_id = b.id
    WHERE e.created_at >= ?
      AND e.created_at <= ?
      AND b.area IS NOT NULL
    GROUP BY b.area, b.city
    ORDER BY view_count DESC
    LIMIT 10
  `,

  // query: platform-wide ad impressions and clicks — params: start, end
  adminAdvertisingSummary: `
    SELECT
      COALESCE(SUM(event_type = 'advertisement_impression'), 0) AS total_impressions,
      COALESCE(SUM(event_type = 'advertisement_click'), 0)      AS total_clicks
    FROM events
    WHERE created_at >= ? AND created_at <= ?
  `,

  // query: count of currently active ad campaigns — no params
  adminActiveCampaigns:
    "SELECT COUNT(*) AS count FROM advertisements WHERE status = 'active'",

  // query: top 5 advertisers by impression volume — params: start, end
  adminTopAdvertisers: `
    SELECT b.id, b.name, COUNT(e.id) AS impressions
    FROM advertisements a
    JOIN businesses b ON b.id = a.business_id
    JOIN events e
      ON e.advertisement_id = a.id
      AND e.event_type = 'advertisement_impression'
    WHERE e.created_at >= ? AND e.created_at <= ?
    GROUP BY b.id, b.name
    ORDER BY impressions DESC
    LIMIT 5
  `,

  // query: revenue grouped by transaction type for paid transactions — params: start, end
  adminRevenueSummary: `
    SELECT
      transaction_type,
      SUM(amount)  AS total,
      COUNT(*)     AS count,
      currency
    FROM revenue_transactions
    WHERE status = 'paid'
      AND created_at >= ?
      AND created_at <= ?
    GROUP BY transaction_type, currency
  `,

  // query: 50 most recent revenue transactions in the date window — params: start, end
  adminRevenueTransactions: `
    SELECT
      rt.id,
      b.name        AS business_name,
      rt.transaction_type,
      rt.amount,
      rt.currency,
      rt.status,
      rt.paid_at,
      rt.created_at
    FROM revenue_transactions rt
    JOIN businesses b ON b.id = rt.business_id
    WHERE rt.created_at >= ? AND rt.created_at <= ?
    ORDER BY rt.created_at DESC
    LIMIT 50
  `,
};

// ---------------------------------------------------------------------------
// Password reset token statements
// ---------------------------------------------------------------------------

export const passwordResetStatements = {
  /**
   * Insert a new reset token.
   * Params: account_type, business_account_id, admin_id, token_hash, expires_at
   */
  create:
    "INSERT INTO password_reset_tokens (account_type, business_account_id, admin_id, token_hash, expires_at) VALUES (?, ?, ?, ?, ?)",

  /**
   * Find a valid (unused, non-expired) token by its hash.
   * Params: token_hash
   */
  findByTokenHash:
    "SELECT id, account_type, business_account_id, admin_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW() LIMIT 1",

  /**
   * Mark a token as used.
   * Params: id
   */
  markUsed:
    "UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?",

  /**
   * Delete all expired tokens (for periodic cleanup).
   */
  deleteExpired:
    "DELETE FROM password_reset_tokens WHERE expires_at < NOW()",
};
