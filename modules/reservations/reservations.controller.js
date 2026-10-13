import {
  cancelUserReservation,
  createReservation,
  getUserReservation,
  listBusinessReservations,
  listUserReservations,
  updateBusinessReservationStatus,
} from "./reservations.service.js";

export async function create(req, res, next) {
  try {
    const result = await createReservation(req.user.id, req.valid.body);
    return res.status(201).json(result);
  } catch (error) { return next(error); }
}

export async function listMine(req, res, next) {
  try { return res.json(await listUserReservations(req.user.id, req.query)); }
  catch (error) { return next(error); }
}

export async function getMine(req, res, next) {
  try { return res.json(await getUserReservation(req.user.id, req.params.id)); }
  catch (error) { return next(error); }
}

export async function cancelMine(req, res, next) {
  try { return res.json(await cancelUserReservation(req.user.id, req.params.id)); }
  catch (error) { return next(error); }
}

export async function listForBusiness(req, res, next) {
  try { return res.json(await listBusinessReservations(req.businessAccount.id, req.query)); }
  catch (error) { return next(error); }
}

export async function updateStatus(req, res, next) {
  try {
    return res.json(await updateBusinessReservationStatus(
      req.businessAccount.id,
      req.params.id,
      req.body.status
    ));
  } catch (error) { return next(error); }
}
