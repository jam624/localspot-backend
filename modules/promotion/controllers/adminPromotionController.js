const Promotion = require('../models/Promotion');

/**
 * GET /api/v1/admin/promotions   (ADMIN)
 * Full visibility across every promotion, any status — this is the queue
 * admins work from (PRD §16.6: "View promotions").
 */
async function listAll(req, res, next) {
  try {
    const { status, businessId, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (businessId) filter.business = businessId;

    const promotions = await Promotion.find(filter)
      .populate('business', 'name email category city')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Promotion.countDocuments(filter);

    res.json({
      data: promotions,
      pagination: { page: Number(page), limit: Number(limit), total },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/promotions/:id   (ADMIN)
 */
async function getOne(req, res, next) {
  try {
    const promo = await Promotion.findById(req.params.id).populate(
      'business',
      'name email category city'
    );
    if (!promo) return res.status(404).json({ error: 'Promotion not found' });
    res.json({ data: promo });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/promotions/:id/approve   (ADMIN)
 * Only promotions actually submitted for review can be approved.
 */
async function approve(req, res, next) {
  try {
    const promo = await Promotion.findById(req.params.id);
    if (!promo) return res.status(404).json({ error: 'Promotion not found' });
    if (promo.status !== 'pending') {
      return res.status(400).json({
        error: `Cannot approve a promotion with status '${promo.status}'. Only 'pending' promotions can be approved.`,
      });
    }

    promo.status = 'approved';
    promo.reviewedBy = req.user.id;
    promo.reviewedAt = new Date();
    promo.rejectionReason = null;
    await promo.save();

    res.json({ data: promo });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/promotions/:id/reject   (ADMIN)
 * Not in the original endpoint table, but the natural counterpart to
 * approve — sends a pending promotion back to the business with a reason.
 */
async function reject(req, res, next) {
  try {
    const { reason } = req.body;
    const promo = await Promotion.findById(req.params.id);
    if (!promo) return res.status(404).json({ error: 'Promotion not found' });
    if (promo.status !== 'pending') {
      return res.status(400).json({
        error: `Cannot reject a promotion with status '${promo.status}'. Only 'pending' promotions can be rejected.`,
      });
    }

    promo.status = 'rejected';
    promo.reviewedBy = req.user.id;
    promo.reviewedAt = new Date();
    promo.rejectionReason = reason || null;
    await promo.save();

    res.json({ data: promo });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/promotions/:id/disable   (ADMIN)
 * Takes a live (approved) promotion down without deleting it — e.g. for
 * policy violations or a business request to pause early.
 */
async function disable(req, res, next) {
  try {
    const promo = await Promotion.findById(req.params.id);
    if (!promo) return res.status(404).json({ error: 'Promotion not found' });
    if (promo.status !== 'approved') {
      return res.status(400).json({
        error: `Cannot disable a promotion with status '${promo.status}'. Only 'approved' promotions can be disabled.`,
      });
    }

    promo.status = 'disabled';
    promo.reviewedBy = req.user.id;
    promo.reviewedAt = new Date();
    await promo.save();

    res.json({ data: promo });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/admin/promotions/expired   (ADMIN)
 * Removes promotions whose endDate has passed. Safe to call manually from
 * the admin dashboard AND on a schedule (see routes file / cron note).
 */
async function removeExpired(req, res, next) {
  try {
    const now = new Date();
    const result = await Promotion.deleteMany({
      endDate: { $lt: now },
      status: { $in: ['approved', 'disabled', 'expired'] },
    });

    res.json({ message: 'Expired promotions removed', deletedCount: result.deletedCount });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAll, getOne, approve, reject, disable, removeExpired };
