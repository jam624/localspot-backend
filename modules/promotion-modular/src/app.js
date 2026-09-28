const express = require('express');
const promotion = require('./modules/promotion');
const errorHandler = require('./shared/middleware/errorHandler');

const app = express();
app.use(express.json());

// As new feature modules are added (business, ad, category, ...), they
// mount the same way: const business = require('./modules/business');
app.use('/api/v1/business/promotions', promotion.publicRouter);
app.use('/api/v1/admin/promotions', promotion.adminRouter);

// Must be registered last — catches errors thrown/passed from any module.
app.use(errorHandler);

module.exports = app;

/**
 * Resulting endpoint map — unchanged from the original table:
 *
 * PUBLIC
 *   GET    /api/v1/business/promotions
 *   GET    /api/v1/business/promotions/:id
 *
 * BUSINESS (auth required, role: business)
 *   GET    /api/v1/business/promotions/mine/all
 *   POST   /api/v1/business/promotions
 *   PUT    /api/v1/business/promotions/:id
 *   DELETE /api/v1/business/promotions/:id      (business owner or admin)
 *   POST   /api/v1/business/promotions/:id/submit
 *
 * ADMIN (auth required, role: admin)
 *   GET    /api/v1/admin/promotions
 *   GET    /api/v1/admin/promotions/:id
 *   POST   /api/v1/admin/promotions/:id/approve
 *   POST   /api/v1/admin/promotions/:id/reject
 *   POST   /api/v1/admin/promotions/:id/disable
 *   DELETE /api/v1/admin/promotions/expired
 */

/**
 * Optional scheduled sweep (requires `npm install node-cron`):
 *
 *   const cron = require('node-cron');
 *   const { service } = require('./modules/promotion');
 *
 *   cron.schedule('0 3 * * *', async () => {
 *     const deletedCount = await service.removeExpiredPromotions();
 *     console.log(`[promotion-cleanup] removed ${deletedCount} expired promotions`);
 *   });
 */
