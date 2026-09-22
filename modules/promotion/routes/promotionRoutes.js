const router = require('express').Router();
const { authenticate, requireAuth, requireRole } = require('../middleware/auth');
const promotionController = require('../controllers/promotionController');
const adminPromotionController = require('../controllers/adminPromotionController');

// Populates req.user if a token is present, but never blocks the request —
// required since GET / and GET /:id are public but behave a bit differently
// for an authenticated owner/admin (see getOne).
router.use(authenticate);

/* ---------------------------------- PUBLIC --------------------------------- */
router.get('/', promotionController.listPublic);
router.get('/:id', promotionController.getOne);

/* --------------------------------- BUSINESS --------------------------------- */
router.get('/mine/all', requireAuth, requireRole('business'), promotionController.listMine);
router.post('/', requireAuth, requireRole('business'), promotionController.create);
router.put('/:id', requireAuth, requireRole('business'), promotionController.update);
router.delete('/:id', requireAuth, requireRole('business', 'admin'), promotionController.remove);
router.post('/:id/submit', requireAuth, requireRole('business'), promotionController.submitForReview);

/* ----------------------------------- ADMIN ----------------------------------- */
// Mounted under /api/v1/admin/promotions in app.js (see wiring note below).
const adminRouter = require('express').Router();
adminRouter.use(requireAuth, requireRole('admin'));

adminRouter.get('/', adminPromotionController.listAll);
adminRouter.get('/:id', adminPromotionController.getOne);
adminRouter.post('/:id/approve', adminPromotionController.approve);
adminRouter.post('/:id/reject', adminPromotionController.reject);
adminRouter.post('/:id/disable', adminPromotionController.disable);
adminRouter.delete('/expired', adminPromotionController.removeExpired);

module.exports = { promotionRouter: router, adminPromotionRouter: adminRouter };
