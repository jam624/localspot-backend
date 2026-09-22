const router = require('express').Router();
const { authenticate, requireAuth, requireRole } = require('../../shared/middleware/auth');
const catchAsync = require('../../shared/utils/catchAsync');
const controller = require('./promotion.admin.controller');

// authenticate populates req.user; requireRole enforces admin-only access.
// Included here (rather than assumed global) so this router works whether
// or not `authenticate` is already mounted app-wide.
router.use(authenticate, requireAuth, requireRole('admin'));

router.get('/', catchAsync(controller.listAll));
router.get('/:id', catchAsync(controller.getOne));
router.post('/:id/approve', catchAsync(controller.approve));
router.post('/:id/reject', catchAsync(controller.reject));
router.post('/:id/disable', catchAsync(controller.disable));
router.delete('/expired', catchAsync(controller.removeExpired));

module.exports = router;
