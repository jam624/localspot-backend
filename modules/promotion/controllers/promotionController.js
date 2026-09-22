const Promotion = require('../models/Promotion');

/**
 * GET /api/v1/business/promotions   (PUBLIC)
 * Consumer-facing feed: only approved promotions currently within their
 * date window are visible. Used on homepage / category pages / business
 * profile per PRD §10.5.
 */
async function listPublic(req, res, next) {
  try {
    const now = new Date();
    const { businessId, category, page = 1, limit = 20 } = req.query;

    const filter = {
      status: 'approved',
      startDate: { $lte: now },
      endDate: { $gte: now },
    };
    if (businessId) filter.business = businessId;

    const promotions = await Promotion.find(filter)
      .populate('business', 'name category city area logo') // trim to public-safe fields
      .sort({ startDate: -1 })
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
 * GET /api/v1/business/promotions/:id   (PUBLIC)
 * Anyone can view a single promotion, but only if it's actually approved —
 * a draft/pending promotion shouldn't be guessable/visible via direct link.
 * Business owners and admins can see their own regardless of status.
 */
async function getOne(req, res, next) {
  try {
    const promo = await Promotion.findById(req.params.id).populate(
      'business',
      'name category city area logo'
    );
    if (!promo) return res.status(404).json({ error: 'Promotion not found' });

    const isOwner = req.user?.role === 'business' && String(promo.business._id) === String(req.user.id);
    const isAdmin = req.user?.role === 'admin';

    if (promo.status !== 'approved' && !isOwner && !isAdmin) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    res.json({ data: promo });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/business/promotions   (BUSINESS)
 * Created as 'draft' — nothing goes live until the owner calls /submit
 * and an admin approves it.
 */
async function create(req, res, next) {
  try {
    const { title, description, image, startDate, endDate } = req.body;

    const promo = await Promotion.create({
      business: req.user.id,
      title,
      description,
      image,
      startDate,
      endDate,
      status: 'draft',
    });

    res.status(201).json({ data: promo });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/business/promotions/:id   (BUSINESS — owner only)
 * Editing a promotion that's already pending/approved bumps it back to
 * draft so admins re-review the actual content that will go live.
 */
async function update(req, res, next) {
  try {
    const promo = await Promotion.findById(req.params.id);
    if (!promo) return res.status(404).json({ error: 'Promotion not found' });
    if (String(promo.business) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Not your promotion' });
    }

    const { title, description, image, startDate, endDate } = req.body;
    if (title !== undefined) promo.title = title;
    if (description !== undefined) promo.description = description;
    if (image !== undefined) promo.image = image;
    if (startDate !== undefined) promo.startDate = startDate;
    if (endDate !== undefined) promo.endDate = endDate;

    if (['pending', 'approved'].includes(promo.status)) {
      promo.status = 'draft';
      promo.reviewedBy = null;
      promo.reviewedAt = null;
    }

    await promo.save();
    res.json({ data: promo });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/business/promotions/:id   (BUSINESS owner, or ADMIN)
 */
async function remove(req, res, next) {
  try {
    const promo = await Promotion.findById(req.params.id);
    if (!promo) return res.status(404).json({ error: 'Promotion not found' });

    const isOwner = req.user.role === 'business' && String(promo.business) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Not your promotion' });
    }

    await promo.deleteOne();
    res.json({ message: 'Promotion deleted' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/business/promotions/:id/submit   (BUSINESS — owner only)
 * Moves a draft into the admin review queue.
 */
async function submitForReview(req, res, next) {
  try {
    const promo = await Promotion.findById(req.params.id);
    if (!promo) return res.status(404).json({ error: 'Promotion not found' });
    if (String(promo.business) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Not your promotion' });
    }
    if (promo.status !== 'draft') {
      return res.status(400).json({ error: `Cannot submit a promotion with status '${promo.status}'` });
    }

    promo.status = 'pending';
    await promo.save();
    res.json({ data: promo });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/business/promotions/mine   (BUSINESS — owner only)
 * A business's own promotions regardless of status, for their dashboard.
 */
async function listMine(req, res, next) {
  try {
    const { status } = req.query;
    const filter = { business: req.user.id };
    if (status) filter.status = status;

    const promotions = await Promotion.find(filter).sort({ createdAt: -1 });
    res.json({ data: promotions });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listPublic,
  getOne,
  create,
  update,
  remove,
  submitForReview,
  listMine,
};
