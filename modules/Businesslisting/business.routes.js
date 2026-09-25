const express = require('express');
const c = require('../controllers/business.controller');
const v = require('../validators/business.validator');
// Adjust to your auth middleware: `protect` must set req.user = { id, role },
// and `authorize(...roles)` must check req.user.role ('business' | 'admin').
const { protect, authorize } = require('../middleware/auth');

// ---- Public (no auth) ------------------------------------------------------
const publicRouter = express.Router();
publicRouter.get('/', v.validate(v.listQuerySchema, 'query'), c.listBusinesses);
publicRouter.get('/:slug', c.getBySlug);

// ---- Business owner --------------------------------------------------------
const ownerRouter = express.Router();
ownerRouter.use(protect, authorize('business'));
ownerRouter.post('/', v.validate(v.createSchema), c.createMine);
ownerRouter.get('/', c.listMine);
ownerRouter.get('/:id', v.validateId, c.getMine);
ownerRouter.patch('/:id', v.validateId, v.validate(v.updateSchema), c.updateMine);
ownerRouter.post('/:id/submit', v.validateId, c.submitMine);

// ---- Admin -----------------------------------------------------------------
const adminRouter = express.Router();
adminRouter.use(protect, authorize('admin'));
adminRouter.get('/', v.validate(v.adminListQuerySchema, 'query'), c.adminList);
adminRouter.post('/', v.validate(v.adminCreateSchema), c.adminCreate);
adminRouter.get('/:id', v.validateId, c.adminGet);
adminRouter.patch('/:id', v.validateId, v.validate(v.updateSchema), c.adminUpdate);
adminRouter.patch('/:id/status', v.validateId, v.validate(v.statusSchema), c.adminSetStatus);
adminRouter.patch('/:id/active', v.validateId, v.validate(v.activeSchema), c.adminSetActive);

module.exports = { publicRouter, ownerRouter, adminRouter };

/* Mount in app.js:
const { publicRouter, ownerRouter, adminRouter } = require('./routes/business.routes');
app.use('/api/businesses', publicRouter);
app.use('/api/portal/businesses', ownerRouter);
app.use('/api/admin/businesses', adminRouter);
*/
