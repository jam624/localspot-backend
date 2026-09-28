const service = require('./promotion.service');

async function listAll(req, res) {
  const { status, businessId, page = 1, limit = 20 } = req.query;
  const result = await service.adminListPromotions({
    status,
    businessId,
    page: Number(page),
    limit: Number(limit),
  });
  res.json(result);
}

async function getOne(req, res) {
  const promo = await service.getPromotionById(req.params.id, req.user);
  res.json({ data: promo });
}

async function approve(req, res) {
  const promo = await service.approvePromotion(req.params.id, req.user.id);
  res.json({ data: promo });
}

async function reject(req, res) {
  const promo = await service.rejectPromotion(req.params.id, req.user.id, req.body.reason);
  res.json({ data: promo });
}

async function disable(req, res) {
  const promo = await service.disablePromotion(req.params.id, req.user.id);
  res.json({ data: promo });
}

async function removeExpired(req, res) {
  const deletedCount = await service.removeExpiredPromotions();
  res.json({ message: 'Expired promotions removed', deletedCount });
}

module.exports = { listAll, getOne, approve, reject, disable, removeExpired };
