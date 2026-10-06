import {
  createFeaturedListingRequest,
  getMyFeaturedListingRequests,
  getMyFeaturedListingRequestById,
  adminListFeaturedListings,
  adminGetFeaturedListingById,
  adminApproveFeaturedListing,
  adminRejectFeaturedListing,
  adminActivateFeaturedListing,
  adminDisableFeaturedListing,
} from "../services/featuredListings.service.js";

// ─── Business ────────────────────────────────────────────────────────────────

// controller: POST /api/v1/featured-listings/requests — submit a featured listing request
export async function submitRequest(req, res, next) {
  try {
    const result = await createFeaturedListingRequest(req.businessAccount.id, req.body);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

// controller: GET /api/v1/featured-listings/requests — list own requests
export async function listMyRequests(req, res, next) {
  try {
    const result = await getMyFeaturedListingRequests(req.businessAccount.id, req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

// controller: GET /api/v1/featured-listings/requests/:id — get a single request
export async function getMyRequestById(req, res, next) {
  try {
    const result = await getMyFeaturedListingRequestById(
      req.businessAccount.id,
      req.params.id
    );
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

// ─── Admin ───────────────────────────────────────────────────────────────────

// controller: GET /api/v1/admin/featured-listings — list all requests
export async function adminList(req, res, next) {
  try {
    const result = await adminListFeaturedListings(req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

// controller: GET /api/v1/admin/featured-listings/:id — view a single request
export async function adminGetOne(req, res, next) {
  try {
    const result = await adminGetFeaturedListingById(req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

// controller: POST /api/v1/admin/featured-listings/:id/approve
export async function adminApprove(req, res, next) {
  try {
    const result = await adminApproveFeaturedListing(req.params.id, req.admin.id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

// controller: POST /api/v1/admin/featured-listings/:id/reject
export async function adminReject(req, res, next) {
  try {
    const result = await adminRejectFeaturedListing(
      req.params.id,
      req.admin.id,
      req.body.rejection_reason
    );
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

// controller: POST /api/v1/admin/featured-listings/:id/activate
export async function adminActivate(req, res, next) {
  try {
    const result = await adminActivateFeaturedListing(req.params.id, req.admin.id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

// controller: POST /api/v1/admin/featured-listings/:id/disable
export async function adminDisable(req, res, next) {
  try {
    const result = await adminDisableFeaturedListing(req.params.id, req.admin.id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}
