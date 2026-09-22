const router = require('express').Router();
const { authenticate, requireAuth, requireRole } = require('../../shared/middleware/auth');
const catchAsync = require('../../shared/utils/catchAsync');
const controller = require('./promotion.controller');
const { validateCreate, validateUpdate } = require('./promotion.validation');

// Populates req.user without blocking — GET / and GET /:id are public but
// behave slightly differently for an authenticated owner/admin.
router.use(authenticate);

/* PUBLIC */
router.get('/', catchAsync(controller.listPublic));
router.get('/:id', catchAsync(controller.getOne));

/* BUSINESS */
router.get('/mine/all', requireAuth, requireRole('business'), catchAsync(controller.listMine));
router.post('/', requireAuth, requireRole('business'), validateCreate, catchAsync(controller.create));
router.put('/:id', requireAuth, requireRole('business'), validateUpdate, catchAsync(controller.update));
router.delete('/:id', requireAuth, requireRole('business', 'admin'), catchAsync(controller.remove));
router.post('/:id/submit', requireAuth, requireRole('business'), catchAsync(controller.submitForReview));

module.exports = router;
