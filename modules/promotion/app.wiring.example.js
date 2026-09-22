/**
 * Example of how to mount the promotion routers in your main app file.
 * Merge this into your existing app.js / server.js — this is not meant
 * to replace it.
 */
const express = require('express');
const { promotionRouter, adminPromotionRouter } = require('./routes/promotionRoutes');

const app = express();
app.use(express.json());

// Public + business promotion endpoints (matches your original table)
app.use('/api/v1/business/promotions', promotionRouter);

// Admin promotion endpoints
app.use('/api/v1/admin/promotions', adminPromotionRouter);

module.exports = app;

/**
 * Resulting endpoint map:
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
 * Optional: scheduled sweep so expired promotions get cleaned up without
 * an admin needing to click the button. Requires `npm install node-cron`.
 *
 *   const cron = require('node-cron');
 *   const Promotion = require('./models/Promotion');
 *
 *   cron.schedule('0 3 * * *', async () => { // daily at 3am
 *     const now = new Date();
 *     const result = await Promotion.deleteMany({
 *       endDate: { $lt: now },
 *       status: { $in: ['approved', 'disabled', 'expired'] },
 *     });
 *     console.log(`[promotion-cleanup] removed ${result.deletedCount} expired promotions`);
 *   });
 */
