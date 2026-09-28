const Business = require('../models/business.model');
const { getLocalDayAndMinute, isOpenAt } = require('../utils/openingHours');

const { TRANSITIONS } = Business;

// A foreign-key failure means the category or owner id doesn't exist.
const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(422).json({ success: false, message: 'Referenced category or owner does not exist' });
    }
    next(err);
  }
};

const notFound = (res) => res.status(404).json({ success: false, message: 'Listing not found' });
const incomplete = (res, missing) =>
  res.status(422).json({ success: false, message: 'Listing is incomplete', missing });

/** Public shape: no owner or moderation info; adds isOpenNow. */
function serializePublic(b, now, { includeHours = false } = {}) {
  const { ownerId, statusReason, hours, ...rest } = b;
  return { ...rest, isOpenNow: isOpenAt(hours, now), ...(includeHours ? { hours } : {}) };
}

// ---------------------------------------------------------------- PUBLIC

exports.listBusinesses = asyncHandler(async (req, res) => {
  const q = req.valid.query;
  const now = getLocalDayAndMinute();
  const { items, total } = await Business.searchPublic(q, now);

  res.json({
    success: true,
    data: items.map((b) => serializePublic(b, now)),
    pagination: { page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) },
  });
});

exports.getBySlug = asyncHandler(async (req, res) => {
  const business = await Business.findPublicBySlug(req.params.slug);
  if (!business) return res.status(404).json({ success: false, message: 'Business not found' });

  // Fire-and-forget so a counter failure never breaks the page.
  Business.incrementViews(business.id).catch(() => {});

  res.json({ success: true, data: serializePublic(business, getLocalDayAndMinute(), { includeHours: true }) });
});

// ---------------------------------------------------------------- BUSINESS OWNER

exports.createMine = asyncHandler(async (req, res) => {
  const business = await Business.create(req.valid.body, {
    ownerId: req.user.id,
    createdBy: req.user.id,
  });
  res.status(201).json({ success: true, data: business });
});

exports.listMine = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await Business.listByOwner(req.user.id) });
});

exports.getMine = asyncHandler(async (req, res) => {
  const business = await Business.findById(Number(req.params.id), { ownerId: req.user.id });
  if (!business) return notFound(res);
  res.json({ success: true, data: business });
});

exports.updateMine = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const business = await Business.findById(id, { ownerId: req.user.id });
  if (!business) return notFound(res);

  if (['submitted', 'pending_approval'].includes(business.status)) {
    return res.status(409).json({ success: false, message: 'Listing is under review and cannot be edited' });
  }
  if (business.status === 'suspended') {
    return res.status(403).json({ success: false, message: 'Listing is suspended. Contact support.' });
  }

  // Editing a rejected listing puts it back to draft so it can be resubmitted.
  const extra = business.status === 'rejected' ? { status: 'draft', status_reason: null } : {};
  const updated = await Business.update(id, req.valid.body, extra);
  res.json({ success: true, data: updated });
});

exports.submitMine = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const business = await Business.findById(id, { ownerId: req.user.id });
  if (!business) return notFound(res);

  if (business.status !== 'draft') {
    return res.status(409).json({ success: false, message: `A ${business.status} listing cannot be submitted` });
  }
  const missing = Business.missingFields(business);
  if (missing.length) return incomplete(res, missing);

  if (!(await Business.setStatus(id, 'draft', 'submitted'))) {
    return res.status(409).json({ success: false, message: 'Listing status changed. Please refresh.' });
  }
  res.json({ success: true, data: await Business.findById(id) });
});

// ---------------------------------------------------------------- ADMIN

exports.adminList = asyncHandler(async (req, res) => {
  const q = req.valid.query;
  const { items, total } = await Business.adminList(q);
  res.json({
    success: true,
    data: items,
    pagination: { page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) },
  });
});

exports.adminGet = asyncHandler(async (req, res) => {
  const business = await Business.findById(Number(req.params.id));
  if (!business) return notFound(res);
  res.json({ success: true, data: business });
});

exports.adminCreate = asyncHandler(async (req, res) => {
  const { owner, publish, ...data } = req.valid.body;

  if (publish) {
    // Check completeness on the input itself before writing anything.
    const missing = Business.missingFields({
      name: data.name, description: data.description, phone: data.phone, address: data.address,
      city: data.city, area: data.area, category: { id: data.category }, location: data.location || null,
    });
    if (missing.length) return incomplete(res, missing);
  }

  const business = await Business.create(data, {
    ownerId: owner || null, // null = admin-managed listing (PRD §23)
    createdBy: req.user.id,
    publish: !!publish,
  });
  res.status(201).json({ success: true, data: business });
});

exports.adminUpdate = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!(await Business.findById(id))) return notFound(res);
  res.json({ success: true, data: await Business.update(id, req.valid.body) });
});

exports.adminSetStatus = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { status, reason } = req.valid.body;

  const business = await Business.findById(id);
  if (!business) return notFound(res);

  if (!TRANSITIONS[business.status]?.includes(status)) {
    return res.status(409).json({
      success: false,
      message: `Cannot move a listing from "${business.status}" to "${status}"`,
      allowed: TRANSITIONS[business.status] || [],
    });
  }
  if (status === 'published') {
    const missing = Business.missingFields(business);
    if (missing.length) return incomplete(res, missing);
  }

  if (!(await Business.setStatus(id, business.status, status, reason))) {
    return res.status(409).json({ success: false, message: 'Listing status changed. Please refresh.' });
  }
  res.json({ success: true, data: await Business.findById(id) });
});

exports.adminSetActive = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!(await Business.setActive(id, req.valid.body.isActive))) {
    // affectedRows is 0 both for "missing" and "already that value", so check existence
    if (!(await Business.findById(id))) return notFound(res);
  }
  res.json({ success: true, data: await Business.findById(id) });
});
