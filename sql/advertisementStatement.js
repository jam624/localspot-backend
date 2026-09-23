// ---------------------------------------------------------------------------
// Advertisement types & slots
// ---------------------------------------------------------------------------

export const advertisementTypeStatements = {
  listActive:
    "SELECT id, code, name, description, base_price, is_active, created_at FROM advertisement_types WHERE is_active = 1 ORDER BY name ASC",

  listAll:
    "SELECT id, code, name, description, base_price, is_active, created_at FROM advertisement_types ORDER BY name ASC",

  findById:
    "SELECT id, code, name, description, base_price, is_active FROM advertisement_types WHERE id = ? LIMIT 1",

  findByCode:
    "SELECT id, code, name, description, base_price, is_active FROM advertisement_types WHERE code = ? LIMIT 1",

  create:
    "INSERT INTO advertisement_types (code, name, description, base_price, is_active) VALUES (?, ?, ?, ?, ?)",

  update:
    "UPDATE advertisement_types SET name = ?, description = ?, base_price = ?, is_active = ? WHERE id = ?",
};

export const advertisementSlotStatements = {
  listActive: `
    SELECT s.id, s.type_id, s.code, s.name, s.placement, s.max_active_campaigns,
           s.is_active, s.created_at,
           t.code AS type_code, t.name AS type_name, t.base_price
    FROM advertisement_slots s
    JOIN advertisement_types t ON t.id = s.type_id
    WHERE s.is_active = 1 AND t.is_active = 1
    ORDER BY t.name ASC, s.name ASC
  `,

  listAll: `
    SELECT s.id, s.type_id, s.code, s.name, s.placement, s.max_active_campaigns,
           s.is_active, s.created_at,
           t.code AS type_code, t.name AS type_name, t.base_price
    FROM advertisement_slots s
    JOIN advertisement_types t ON t.id = s.type_id
    ORDER BY t.name ASC, s.name ASC
  `,

  findById: `
    SELECT s.id, s.type_id, s.code, s.name, s.placement, s.max_active_campaigns,
           s.is_active,
           t.code AS type_code, t.name AS type_name, t.base_price
    FROM advertisement_slots s
    JOIN advertisement_types t ON t.id = s.type_id
    WHERE s.id = ? LIMIT 1
  `,

  findByCode:
    "SELECT id, type_id, code, name, placement, max_active_campaigns, is_active FROM advertisement_slots WHERE code = ? LIMIT 1",

  create:
    "INSERT INTO advertisement_slots (type_id, code, name, placement, max_active_campaigns, is_active) VALUES (?, ?, ?, ?, ?, ?)",

  update:
    "UPDATE advertisement_slots SET name = ?, placement = ?, max_active_campaigns = ?, is_active = ? WHERE id = ?",

  // Used to enforce slot capacity on approval
  countActiveBySlot: `
    SELECT COUNT(*) AS count
    FROM advertisements
    WHERE slot_id = ?
      AND status IN ('approved', 'scheduled', 'active')
  `,
};

// ---------------------------------------------------------------------------
// Advertisements — shared / business / admin
// ---------------------------------------------------------------------------

export const advertisementStatements = {
  // -------- Business side --------

  findBusinessByAccountId:
    "SELECT id, name, slug, listing_status FROM businesses WHERE account_id = ? LIMIT 1",

  create: `
    INSERT INTO advertisements
      (business_id, slot_id, target_category_id, target_location, title, body,
       image_url, destination_url, starts_at, ends_at, budget, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
  `,

  listByBusiness: `
    SELECT a.id, a.business_id, a.slot_id, a.target_category_id, a.target_location,
           a.title, a.body, a.image_url, a.destination_url,
           a.starts_at, a.ends_at, a.budget, a.status,
           a.rejection_reason, a.approved_at, a.created_at, a.updated_at,
           s.code AS slot_code, s.name AS slot_name, s.placement AS slot_placement,
           t.code AS type_code, t.name AS type_name
    FROM advertisements a
    JOIN advertisement_slots s ON s.id = a.slot_id
    JOIN advertisement_types t ON t.id = s.type_id
    WHERE a.business_id = ?
    ORDER BY a.created_at DESC
    LIMIT 200
  `,

  findById: `
    SELECT a.*,
           s.code AS slot_code, s.name AS slot_name, s.placement AS slot_placement,
           s.max_active_campaigns,
           t.code AS type_code, t.name AS type_name,
           b.name AS business_name, b.slug AS business_slug, b.account_id
    FROM advertisements a
    JOIN advertisement_slots s ON s.id = a.slot_id
    JOIN advertisement_types t ON t.id = s.type_id
    JOIN businesses b ON b.id = a.business_id
    WHERE a.id = ?
    LIMIT 1
  `,

  update: `
    UPDATE advertisements
    SET slot_id = ?,
        target_category_id = ?,
        target_location = ?,
        title = ?,
        body = ?,
        image_url = ?,
        destination_url = ?,
        starts_at = ?,
        ends_at = ?,
        budget = ?
    WHERE id = ?
  `,

  updateStatus:
    "UPDATE advertisements SET status = ? WHERE id = ?",

  delete:
    "DELETE FROM advertisements WHERE id = ?",

  // -------- Admin side (dynamic builder used in controller) --------

  adminFindById: `
    SELECT a.*,
           s.code AS slot_code, s.name AS slot_name, s.placement AS slot_placement,
           s.max_active_campaigns,
           t.code AS type_code, t.name AS type_name, t.base_price,
           b.name AS business_name, b.slug AS business_slug, b.email AS business_email,
           ad.name AS approved_by_name
    FROM advertisements a
    JOIN advertisement_slots s ON s.id = a.slot_id
    JOIN advertisement_types t ON t.id = s.type_id
    JOIN businesses b ON b.id = a.business_id
    LEFT JOIN admins ad ON ad.id = a.approved_by
    WHERE a.id = ?
    LIMIT 1
  `,

  adminApprove:
    "UPDATE advertisements SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP, rejection_reason = NULL WHERE id = ?",

  adminReject:
    "UPDATE advertisements SET status = 'rejected', rejection_reason = ?, approved_by = ?, approved_at = NULL WHERE id = ?",

  adminSetStatus:
    "UPDATE advertisements SET status = ? WHERE id = ?",

  adminDelete:
    "DELETE FROM advertisements WHERE id = ?",

  adminCountByStatus: `
    SELECT status, COUNT(*) AS count
    FROM advertisements
    GROUP BY status
  `,

  adminActiveCampaigns:
    "SELECT COUNT(*) AS count FROM advertisements WHERE status = 'active'",

  adminStatsSummary: `
    SELECT
      COUNT(*)                                          AS total,
      COALESCE(SUM(status = 'draft'), 0)                AS draft,
      COALESCE(SUM(status = 'pending_approval'), 0)     AS pending,
      COALESCE(SUM(status = 'approved'), 0)             AS approved,
      COALESCE(SUM(status = 'scheduled'), 0)            AS scheduled,
      COALESCE(SUM(status = 'active'), 0)               AS active,
      COALESCE(SUM(status = 'paused'), 0)               AS paused,
      COALESCE(SUM(status = 'rejected'), 0)             AS rejected,
      COALESCE(SUM(status = 'expired'), 0)              AS expired,
      COALESCE(SUM(status = 'disabled'), 0)             AS disabled,
      COALESCE(SUM(created_at >= ?), 0)                 AS new_in_period
    FROM advertisements
  `,

  // -------- Performance (events) --------

  performance: `
    SELECT
      COALESCE(SUM(event_type = 'advertisement_impression'), 0) AS impressions,
      COALESCE(SUM(event_type = 'advertisement_click'), 0)      AS clicks
    FROM events
    WHERE advertisement_id = ?
      AND created_at >= ?
      AND created_at <= ?
  `,
};