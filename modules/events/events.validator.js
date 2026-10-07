// validation: POST /api/v1/events body

const VALID_EVENT_TYPES = [
  "business_view",
  "search",
  "phone_click",
  "whatsapp_click",
  "website_click",
  "directions_click",
  "favorite_add",
  "favorite_remove",
  "advertisement_impression",
  "advertisement_click",
  "promotion_view",
  "business_share",
];

export function validateEvent(req, res, next) {
  const { event, businessId, advertisementId, promotionId, categoryId, searchQuery, platform } =
    req.body;

  if (!event || typeof event !== "string") {
    return res.status(400).json({ message: "event is required" });
  }
  if (!VALID_EVENT_TYPES.includes(event)) {
    return res.status(400).json({
      message: `event must be one of: ${VALID_EVENT_TYPES.join(", ")}`,
    });
  }

  if (businessId !== undefined && (isNaN(Number(businessId)) || Number(businessId) <= 0)) {
    return res.status(400).json({ message: "businessId must be a positive integer" });
  }
  if (advertisementId !== undefined && (isNaN(Number(advertisementId)) || Number(advertisementId) <= 0)) {
    return res.status(400).json({ message: "advertisementId must be a positive integer" });
  }
  if (promotionId !== undefined && (isNaN(Number(promotionId)) || Number(promotionId) <= 0)) {
    return res.status(400).json({ message: "promotionId must be a positive integer" });
  }
  if (categoryId !== undefined && (isNaN(Number(categoryId)) || Number(categoryId) <= 0)) {
    return res.status(400).json({ message: "categoryId must be a positive integer" });
  }
  if (platform !== undefined && typeof platform !== "string") {
    return res.status(400).json({ message: "platform must be a string" });
  }

  return next();
}
