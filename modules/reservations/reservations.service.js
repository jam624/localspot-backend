import { query } from "../../config/db.js";
import { badRequest, notFound } from "../../utils/errors.js";
import { paginationMeta, parsePagination } from "../../utils/pagination.js";

const RESERVATION_FIELDS = `
  r.id, r.user_id, r.business_id, r.service_id, r.reservation_at,
  r.party_size, r.notes, r.status, r.created_at, r.updated_at,
  b.name AS business_name, b.slug AS business_slug,
  s.name AS service_name`;

function serializeReservation(row) {
  return {
    id: Number(row.id),
    business: { id: Number(row.business_id), name: row.business_name, slug: row.business_slug },
    service: row.service_id ? { id: Number(row.service_id), name: row.service_name } : null,
    reservationAt: row.reservation_at,
    partySize: Number(row.party_size),
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findReservation(sql, params) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

export async function createReservation(userId, payload) {
  const businesses = await query(
    "SELECT id FROM businesses WHERE id = ? AND listing_status IN ('published', 'active') LIMIT 1",
    [payload.businessId]
  );
  if (!businesses.length) throw notFound("Business not found");

  if (payload.serviceId) {
    const services = await query(
      "SELECT id FROM business_services WHERE id = ? AND business_id = ? AND is_active = 1 LIMIT 1",
      [payload.serviceId, payload.businessId]
    );
    if (!services.length) throw badRequest("Service is not available for this business");
  }

  const result = await query(
    `INSERT INTO reservations (user_id, business_id, service_id, reservation_at, party_size, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, payload.businessId, payload.serviceId, payload.reservationAt, payload.partySize, payload.notes]
  );
  return getUserReservation(userId, result.insertId);
}

export async function listUserReservations(userId, rawQuery = {}) {
  const { page, limit, offset } = parsePagination(rawQuery);
  const conditions = ["r.user_id = ?"];
  const params = [userId];
  if (rawQuery.status) {
    conditions.push("r.status = ?");
    params.push(rawQuery.status);
  }
  const where = conditions.join(" AND ");
  const countRows = await query(`SELECT COUNT(*) AS total FROM reservations r WHERE ${where}`, params);
  const rows = await query(
    `SELECT ${RESERVATION_FIELDS}
     FROM reservations r
     JOIN businesses b ON b.id = r.business_id
     LEFT JOIN business_services s ON s.id = r.service_id
     WHERE ${where}
     ORDER BY r.reservation_at DESC, r.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const total = Number(countRows[0]?.total || 0);
  return { reservations: rows.map(serializeReservation), meta: paginationMeta(page, limit, total) };
}

export async function getUserReservation(userId, reservationId) {
  const row = await findReservation(
    `SELECT ${RESERVATION_FIELDS}
     FROM reservations r
     JOIN businesses b ON b.id = r.business_id
     LEFT JOIN business_services s ON s.id = r.service_id
     WHERE r.id = ? AND r.user_id = ? LIMIT 1`,
    [reservationId, userId]
  );
  if (!row) throw notFound("Reservation not found");
  return { reservation: serializeReservation(row) };
}

export async function cancelUserReservation(userId, reservationId) {
  const result = await query(
    `UPDATE reservations SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ? AND status IN ('pending', 'confirmed')`,
    [reservationId, userId]
  );
  if (!result.affectedRows) {
    const row = await findReservation("SELECT id, status FROM reservations WHERE id = ? AND user_id = ?", [reservationId, userId]);
    if (!row) throw notFound("Reservation not found");
    throw badRequest(`A ${row.status} reservation cannot be cancelled`);
  }
  return getUserReservation(userId, reservationId);
}

export async function listBusinessReservations(accountId, rawQuery = {}) {
  const { page, limit, offset } = parsePagination(rawQuery);
  const conditions = ["b.account_id = ?"];
  const params = [accountId];
  if (rawQuery.status) {
    conditions.push("r.status = ?");
    params.push(rawQuery.status);
  }
  const where = conditions.join(" AND ");
  const countRows = await query(
    `SELECT COUNT(*) AS total FROM reservations r JOIN businesses b ON b.id = r.business_id WHERE ${where}`,
    params
  );
  const rows = await query(
    `SELECT ${RESERVATION_FIELDS}, u.name AS user_name, u.email AS user_email
     FROM reservations r
     JOIN businesses b ON b.id = r.business_id
     JOIN users u ON u.id = r.user_id
     LEFT JOIN business_services s ON s.id = r.service_id
     WHERE ${where}
     ORDER BY r.reservation_at ASC, r.id ASC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const total = Number(countRows[0]?.total || 0);
  return {
    reservations: rows.map((row) => ({
      ...serializeReservation(row),
      customer: { name: row.user_name, email: row.user_email },
    })),
    meta: paginationMeta(page, limit, total),
  };
}

export async function updateBusinessReservationStatus(accountId, reservationId, status) {
  const row = await findReservation(
    `SELECT r.id, r.status, b.id AS business_id
     FROM reservations r JOIN businesses b ON b.id = r.business_id
     WHERE r.id = ? AND b.account_id = ? LIMIT 1`,
    [reservationId, accountId]
  );
  if (!row) throw notFound("Reservation not found");

  const allowedTransitions = {
    pending: ["confirmed", "rejected"],
    confirmed: ["completed"],
  };
  if (!allowedTransitions[row.status]?.includes(status)) {
    throw badRequest(`A ${row.status} reservation cannot be marked ${status}`);
  }

  const result = await query(
    `UPDATE reservations r
     JOIN businesses b ON b.id = r.business_id
     SET r.status = ?, r.updated_at = CURRENT_TIMESTAMP
     WHERE r.id = ? AND b.account_id = ? AND r.status = ?`,
    [status, reservationId, accountId, row.status]
  );
  if (!result.affectedRows) {
    throw badRequest("Reservation status changed; reload and try again");
  }
  return { message: "Reservation status updated", status };
}
