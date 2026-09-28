/**
 * Promotion feature module.
 *
 * Everything promotion-related — model, service, controllers, validation,
 * routes — lives in this folder. The rest of the app only ever touches
 * this file:
 *
 *   const promotion = require('./modules/promotion');
 *   app.use('/api/v1/business/promotions', promotion.publicRouter);
 *   app.use('/api/v1/admin/promotions', promotion.adminRouter);
 *
 * Need promotion data elsewhere (e.g. a dashboard aggregating multiple
 * modules)? Import the service, not the model — keeps DB access
 * centralized in one place per feature.
 */
module.exports = {
  publicRouter: require('./promotion.routes'),
  adminRouter: require('./promotion.admin.routes'),
  service: require('./promotion.service'),
  Model: require('./promotion.model'),
};
