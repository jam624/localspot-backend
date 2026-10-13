# New Updates

This document describes the consumer account, favorites, and reservation workflows recently added to the LocalSpot backend.

## Consumer Account Workflow

Consumers create their own account. This account is separate from business and admin accounts.

1. Register with `POST /api/v1/auth/user/register`, sending `name`, `email`, and `password` (at least 8 characters).
2. The API creates the account, hashes the password, and returns a user profile and JWT.
3. Sign in later with `POST /api/v1/auth/user/login` using `email` and `password` to receive a new JWT.
4. Send the JWT on protected requests in the `Authorization` header:

   ```http
   Authorization: Bearer <token>
   ```

5. Use `GET /api/v1/auth/user/me` to retrieve the current profile. Update the profile or password with `PATCH /api/v1/auth/user/me`.
6. To sign out, call `POST /api/v1/auth/user/logout` and discard the token on the client. JWT logout is stateless, so discarding the token is what ends the client session.

Password recovery uses `POST /api/v1/auth/user/forgot-password` and `POST /api/v1/auth/user/reset-password`. The reset endpoint accepts the emailed `token` and the new `password`.

The API determines the account ID from the verified JWT. Frontend requests must not send a `userId` to identify the acting user.

## Favorites Workflow

Favorites belong to the signed-in account and are stored in the backend database, so they can be retrieved on another device after signing in.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/favorites` | List the current user's saved businesses |
| `POST` | `/api/v1/favorites/:businessId` | Save a publicly visible business |
| `DELETE` | `/api/v1/favorites/:businessId` | Remove a saved business |

Each request requires the user bearer token. Adding an already-saved business or removing a business that is not saved does not create a duplicate favorite analytics event. On a business detail request, an authenticated user can receive `isFavorited` in the response.

## Reservation Workflow

The consumer submits a reservation request for a publicly visible business. The request starts with `pending`; the business account that owns the listing handles it.

Create a reservation with `POST /api/v1/reservations`:

```json
{
  "businessId": 42,
  "serviceId": 7,
  "reservationAt": "2026-11-10T18:30:00+01:00",
  "partySize": 2,
  "notes": "Window seat, if available"
}
```

`serviceId` and `notes` are optional. `reservationAt` must be a future ISO timestamp with a timezone. `partySize` must be between 1 and 30. When a service is provided, it must be active and belong to the selected business.

Consumers manage their own reservations:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/reservations` | List the current user's reservations; supports pagination and a `status` filter |
| `GET` | `/api/v1/reservations/:id` | View one of the current user's reservations |
| `PATCH` | `/api/v1/reservations/:id/cancel` | Cancel a pending or confirmed reservation |

Business accounts manage requests for listings they own:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/business/reservations` | List reservations for the account's businesses; supports pagination and a `status` filter |
| `PATCH` | `/api/v1/business/reservations/:id/status` | Update a reservation status |

Business endpoints require a business bearer token. The API checks listing ownership before returning or changing reservation data.

Allowed status changes are:

```text
pending   -> confirmed or rejected
confirmed -> completed
```

The consumer may cancel a `pending` or `confirmed` reservation. Rejected, cancelled, and completed reservations are terminal in the current workflow.

## Event Tracking

Public event tracking remains available through `POST /api/v1/events`. If the request includes a valid consumer bearer token, the API associates the event with that account. Otherwise, it records the event without a user ID. Any `userId` supplied in the request body is ignored; identity comes from authentication.

## Database Setup and Current Scope

Run `npm run migrate` to apply the pending migrations. The migration runner applies the user/favorites migration and the reservations migration in order.

Reservations are requests with business-managed status updates. The current implementation does not check calendar availability, enforce business capacity, or prevent overlapping reservation times.
