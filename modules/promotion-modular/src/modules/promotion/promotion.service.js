const Promotion = require('./promotion.model');
const ApiError = require('../../shared/utils/ApiError');

/* -------------------------------------------------------------------- */
/*                              PUBLIC / SHARED                          */
/* -------------------------------------------------------------------- */

async function listPublicPromotions({ businessId, page = 1, limit = 20 }) {
  const now = new Date();
  const filter = { status: 'approved', startDate: { $lte: now }, endDate: { $gte: now } };
  if (businessId) filter.business = businessId;

  const [data, total] = await Promise.all([
    Promotion.find(filter)
      .populate('business', 'name category city area logo')
      .sort({ startDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Promotion.countDocuments(filter),
  ]);

  return { data, pagination: { page, limit, total } };
}

async function getPromotionById(id, requester) {
  const promo = await Promotion.findById(id).populate('business', 'name category city area logo');
  if (!promo) throw new ApiError(404, 'Promotion not found');

  const isOwner = requester?.role === 'business' && String(promo.business._id) === String(requester.id);
  const isAdmin = requester?.role === 'admin';

  if (promo.status !== 'approved' && !isOwner && !isAdmin) {
    throw new ApiError(404, 'Promotion not found');
  }
  return promo;
}

/* -------------------------------------------------------------------- */
/*                                BUSINESS                               */
/* -------------------------------------------------------------------- */

async function createPromotion(businessId, payload) {
  const { title, description, image, startDate, endDate } = payload;
  return Promotion.create({
    business: businessId,
    title,
    description,
    image,
    startDate,
    endDate,
    status: 'draft',
  });
}

async function updatePromotion(id, businessId, payload) {
  const promo = await Promotion.findById(id);
  if (!promo) throw new ApiError(404, 'Promotion not found');
  if (String(promo.business) !== String(businessId)) {
    throw new ApiError(403, 'Not your promotion');
  }

  const { title, description, image, startDate, endDate } = payload;
  if (title !== undefined) promo.title = title;
  if (description !== undefined) promo.description = description;
  if (image !== undefined) promo.image = image;
  if (startDate !== undefined) promo.startDate = startDate;
  if (endDate !== undefined) promo.endDate = endDate;

  // Editing a live/pending promotion sends it back for re-review.
  if (['pending', 'approved'].includes(promo.status)) {
    promo.status = 'draft';
    promo.reviewedBy = null;
    promo.reviewedAt = null;
  }

  return promo.save();
}

async function deletePromotion(id, requester) {
  const promo = await Promotion.findById(id);
  if (!promo) throw new ApiError(404, 'Promotion not found');

  const isOwner = requester.role === 'business' && String(promo.business) === String(requester.id);
  const isAdmin = requester.role === 'admin';
  if (!isOwner && !isAdmin) throw new ApiError(403, 'Not your promotion');

  await promo.deleteOne();
}

async function submitPromotion(id, businessId) {
  const promo = await Promotion.findById(id);
  if (!promo) throw new ApiError(404, 'Promotion not found');
  if (String(promo.business) !== String(businessId)) {
    throw new ApiError(403, 'Not your promotion');
  }
  if (promo.status !== 'draft') {
    throw new ApiError(400, `Cannot submit a promotion with status '${promo.status}'`);
  }

  promo.status = 'pending';
  return promo.save();
}

async function listMyPromotions(businessId, { status }) {
  const filter = { business: businessId };
  if (status) filter.status = status;
  return Promotion.find(filter).sort({ createdAt: -1 });
}

/* -------------------------------------------------------------------- */
/*                                  ADMIN                                 */
/* -------------------------------------------------------------------- */

async function adminListPromotions({ status, businessId, page = 1, limit = 20 }) {
  const filter = {};
  if (status) filter.status = status;
  if (businessId) filter.business = businessId;

  const [data, total] = await Promise.all([
    Promotion.find(filter)
      .populate('business', 'name email category city')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Promotion.countDocuments(filter),
  ]);

  return { data, pagination: { page, limit, total } };
}

async function approvePromotion(id, adminId) {
  const promo = await Promotion.findById(id);
  if (!promo) throw new ApiError(404, 'Promotion not found');
  if (promo.status !== 'pending') {
    throw new ApiError(400, `Cannot approve a promotion with status '${promo.status}'. Only 'pending' promotions can be approved.`);
  }

  promo.status = 'approved';
  promo.reviewedBy = adminId;
  promo.reviewedAt = new Date();
  promo.rejectionReason = null;
  return promo.save();
}

async function rejectPromotion(id, adminId, reason) {
  const promo = await Promotion.findById(id);
  if (!promo) throw new ApiError(404, 'Promotion not found');
  if (promo.status !== 'pending') {
    throw new ApiError(400, `Cannot reject a promotion with status '${promo.status}'. Only 'pending' promotions can be rejected.`);
  }

  promo.status = 'rejected';
  promo.reviewedBy = adminId;
  promo.reviewedAt = new Date();
  promo.rejectionReason = reason || null;
  return promo.save();
}

async function disablePromotion(id, adminId) {
  const promo = await Promotion.findById(id);
  if (!promo) throw new ApiError(404, 'Promotion not found');
  if (promo.status !== 'approved') {
    throw new ApiError(400, `Cannot disable a promotion with status '${promo.status}'. Only 'approved' promotions can be disabled.`);
  }

  promo.status = 'disabled';
  promo.reviewedBy = adminId;
  promo.reviewedAt = new Date();
  return promo.save();
}

async function removeExpiredPromotions() {
  const now = new Date();
  const result = await Promotion.deleteMany({
    endDate: { $lt: now },
    status: { $in: ['approved', 'disabled', 'expired'] },
  });
  return result.deletedCount;
}

module.exports = {
  listPublicPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
  submitPromotion,
  listMyPromotions,
  adminListPromotions,
  approvePromotion,
  rejectPromotion,
  disablePromotion,
  removeExpiredPromotions,
};
