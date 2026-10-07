import {
  getBusinessDashboard,
  getProfile, updateProfile, updateContact, updateLocation,
  updateHours, updateServices, updateAmenities,
  listMedia, addMedia, updateMedia, deleteMedia,
  submitListing, getListingStatus, resubmitListing,
} from "./portal.service.js";

const id = (req) => req.businessAccount.id;

export const dashboard        = wrap((req) => getBusinessDashboard(id(req)));
export const getProfileCtrl   = wrap((req) => getProfile(id(req)));
export const updateProfileCtrl= wrap((req) => updateProfile(id(req), req.body));
export const updateContactCtrl= wrap((req) => updateContact(id(req), req.body));
export const updateLocationCtrl=wrap((req) => updateLocation(id(req), req.body));
export const updateHoursCtrl  = wrap((req) => updateHours(id(req), req.body.hours ?? req.body));
export const updateServicesCtrl=wrap((req) => updateServices(id(req), req.body.services ?? req.body));
export const updateAmenitiesCtrl=wrap((req) => updateAmenities(id(req), req.body.amenityIds ?? req.body));
export const listMediaCtrl    = wrap((req) => listMedia(id(req)));
export const addMediaCtrl     = wrap((req) => addMedia(id(req), req.body), 201);
export const updateMediaCtrl  = wrap((req) => updateMedia(id(req), req.params.mediaId, req.body));
export const deleteMediaCtrl  = wrap((req) => deleteMedia(id(req), req.params.mediaId));
export const submitCtrl       = wrap((req) => submitListing(id(req)));
export const statusCtrl       = wrap((req) => getListingStatus(id(req)));
export const resubmitCtrl     = wrap((req) => resubmitListing(id(req)));

function wrap(fn, status = 200) {
  return async (req, res, next) => {
    try { return res.status(status).json(await fn(req)); }
    catch (e) { return next(e); }
  };
}
