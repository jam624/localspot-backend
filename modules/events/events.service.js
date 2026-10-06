import { query } from "../../config/db.js";

export async function trackEvent(body, req) {
  const {
    event,
    businessId = null,
    advertisementId = null,
    promotionId = null,
    categoryId = null,
    searchQuery = null,
    platform = null,
    metadata = null,
  } = body;

  const visitorId = req.headers["x-visitor-id"] || null;
  const ip = req.ip || req.headers["x-forwarded-for"] || null;
  const userAgent = req.headers["user-agent"] || null;
  const referrer = req.headers["referer"] || null;

  await query(
    `INSERT INTO events
      (event_type, business_id, advertisement_id, promotion_id, category_id,
       search_query, platform, visitor_id, ip_address, user_agent, referrer, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      event,
      businessId ? Number(businessId) : null,
      advertisementId ? Number(advertisementId) : null,
      promotionId ? Number(promotionId) : null,
      categoryId ? Number(categoryId) : null,
      searchQuery || null,
      platform || null,
      visitorId,
      ip,
      userAgent,
      referrer,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );

  return { message: "Event recorded" };
}
