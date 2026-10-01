import * as service from "../services/promotion.service.js";

function serialize(promo, includeReview = false) {
  const result = {
    id: Number(promo.id),
    title: promo.title,
    slug: promo.slug,
    description: promo.description,
    discountLabel: promo.discount_label,
    imageUrl: promo.image_url,
    startsAt: promo.starts_at,
    endsAt: promo.ends_at,
    business: {
      id: Number(promo.business_id),
      name: promo.business_name,
      slug: promo.business_slug,
      logo: promo.business_logo || null,
    },
  };

  if (includeReview) {
    Object.assign(result, {
      status: promo.status,
      rejectionReason: promo.rejection_reason,
      approvedAt: promo.approved_at,
      createdAt: promo.created_at,
      updatedAt: promo.updated_at,
    });
  }

  return result;
}

export async function listPublic(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const result = await service.listPublicPromotions({
      businessId: req.query.businessId,
      page,
      limit,
    });

    return res.json({
      ...result,
      data: result.data.map((item) => serialize(item)),
    });
  } catch (error) {
    return next(error);
  }
}

export async function getOne(req, res, next) {
  try {
    const promo = await service.getPromotionById(req.params.id, {
      businessAccount: req.businessAccount,
      admin: req.admin,
    });
    const isOwner =
      req.businessAccount &&
      Number(promo.account_id) === Number(req.businessAccount.id);

    return res.json({ data: serialize(promo, Boolean(req.admin || isOwner)) });
  } catch (error) {
    return next(error);
  }
}

export async function create(req, res, next) {
  try {
    const promo = await service.createPromotion(req.businessAccount.id, req.body);
    return res.status(201).json({ data: serialize(promo, true) });
  } catch (error) {
    return next(error);
  }
}

export async function update(req, res, next) {
  try {
    const promo = await service.updatePromotion(
      req.params.id,
      req.businessAccount.id,
      req.body
    );
    return res.json({ data: serialize(promo, true) });
  } catch (error) {
    return next(error);
  }
}

export async function remove(req, res, next) {
  try {
    await service.deletePromotion(req.params.id, {
      businessAccount: req.businessAccount,
      admin: req.admin,
    });
    return res.json({ message: "Promotion deleted" });
  } catch (error) {
    return next(error);
  }
}

export async function submitForReview(req, res, next) {
  try {
    const promo = await service.submitPromotion(
      req.params.id,
      req.businessAccount.id
    );
    return res.json({ data: serialize(promo, true) });
  } catch (error) {
    return next(error);
  }
}

export async function listMine(req, res, next) {
  try {
    const promotions = await service.listMyPromotions(
      req.businessAccount.id,
      req.query.status
    );
    return res.json({
      data: promotions.map((item) => serialize(item, true)),
    });
  } catch (error) {
    return next(error);
  }
}

export async function listAll(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const result = await service.adminListPromotions({
      status: req.query.status,
      businessId: req.query.businessId,
      page,
      limit,
    });

    return res.json({
      ...result,
      data: result.data.map((item) => serialize(item, true)),
    });
  } catch (error) {
    return next(error);
  }
}

export async function approve(req, res, next) {
  try {
    const promo = await service.approvePromotion(req.params.id, req.admin.id);
    return res.json({ data: serialize(promo, true) });
  } catch (error) {
    return next(error);
  }
}

export async function reject(req, res, next) {
  try {
    const promo = await service.rejectPromotion(
      req.params.id,
      req.admin.id,
      req.body.reason.trim()
    );
    return res.json({ data: serialize(promo, true) });
  } catch (error) {
    return next(error);
  }
}

export async function disable(req, res, next) {
  try {
    const promo = await service.disablePromotion(req.params.id, req.admin.id);
    return res.json({ data: serialize(promo, true) });
  } catch (error) {
    return next(error);
  }
}

export async function removeExpired(_req, res, next) {
  try {
    const deletedCount = await service.removeExpiredPromotions();
    return res.json({ message: "Expired promotions removed", deletedCount });
  } catch (error) {
    return next(error);
  }
}
