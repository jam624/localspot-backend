const service = require('./promotion.service');

async function listPublic(req, res) {
  const { businessId, page = 1, limit = 20 } = req.query;
  const result = await service.listPublicPromotions({
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

async function create(req, res) {
  const promo = await service.createPromotion(req.user.id, req.body);
  res.status(201).json({ data: promo });
}

async function update(req, res) {
  const promo = await service.updatePromotion(req.params.id, req.user.id, req.body);
  res.json({ data: promo });
}

async function remove(req, res) {
  await service.deletePromotion(req.params.id, req.user);
  res.json({ message: 'Promotion deleted' });
}

async function submitForReview(req, res) {
  const promo = await service.submitPromotion(req.params.id, req.user.id);
  res.json({ data: promo });
}

async function listMine(req, res) {
  const promos = await service.listMyPromotions(req.user.id, { status: req.query.status });
  res.json({ data: promos });
}

module.exports = { listPublic, getOne, create, update, remove, submitForReview, listMine };
