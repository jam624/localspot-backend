# LocalSpot Backend — Setup & Test Guide

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up your `.env`
```bash
cp .env.example .env
```
Edit `.env` and set:
- `DB_PASSWORD` — your MariaDB/MySQL root password (empty string `""` if no password)
- `JWT_SECRET` — any long random string (e.g. `openssl rand -hex 32`)

### 3. Run migrations
```bash
npm run migrate
```
The migration script creates `localspot_db` if it does not exist. The configured database user must have permission to create it.

### 4. Seed an admin user
Generate a scrypt password hash with the same helper used by login, replacing the example with your chosen password:
```bash
node --input-type=module -e "import { hashPassword } from './utils/auth.js'; console.log(await hashPassword('choose-a-local-password'))"
```
Paste the generated hash into the SQL below. Use a different password for each environment.

```sql
USE localspot_db;
INSERT INTO admins (name, email, password_hash, role)
VALUES (
  'Super Admin',
  'admin@localspot.ng',
  '<paste-generated-scrypt-hash-here>',
  'super_admin'
);
```

### 5. Start the server
```bash
npm run dev
```
Server starts on http://localhost:8000

---

## Postman Testing Order

### Step 1 — Health check
```
GET http://localhost:8000/api/v1/health
GET http://localhost:8000/api/v1/health/db
```

### Step 2 — Admin login (get ADMIN_TOKEN)
```
POST http://localhost:8000/api/v1/auth/admin/login
Body: { "email": "admin@localspot.ng", "password": "your-chosen-local-password" }
```
Save the `token` as `ADMIN_TOKEN`.

### Step 3 — Seed categories
```
POST http://localhost:8000/api/v1/admin/categories
Authorization: Bearer {{ADMIN_TOKEN}}
Body: { "name": "Restaurants", "icon": "🍽️", "description": "Food & dining", "sortOrder": 1 }
```
Repeat for: Hotels, Shopping, Health, Entertainment, Services

### Step 4 — Business registration (get BUSINESS_TOKEN)
```
POST http://localhost:8000/api/v1/auth/business/register
Body: {
  "businessName": "Test Kitchen",
  "ownerName": "John Doe",
  "email": "owner@test.com",
  "phone": "+2348012345678",
  "password": "Password1!"
}
```

### Step 5 — Create & submit a listing
```
POST http://localhost:8000/api/v1/portal/businesses
Authorization: Bearer {{BUSINESS_TOKEN}}
Body: {
  "name": "Test Kitchen",
  "category": 1,
  "description": "Best food in PH",
  "phone": "+2348012345678",
  "address": "12 Marina Street",
  "city": "Port Harcourt",
  "area": "GRA",
  "latitude": 4.8156,
  "longitude": 7.0498,
  "priceRange": 2
}

POST http://localhost:8000/api/v1/portal/businesses/1/submit
Authorization: Bearer {{BUSINESS_TOKEN}}
```

### Step 6 — Admin approves listing
```
POST http://localhost:8000/api/v1/admin/businesses/1/publish
Authorization: Bearer {{ADMIN_TOKEN}}
```

### Step 7 — Test all major endpoints
```
# Public
GET  http://localhost:8000/api/v1/businesses
GET  http://localhost:8000/api/v1/businesses/search?q=kitchen
GET  http://localhost:8000/api/v1/businesses/nearby?latitude=4.8156&longitude=7.0498&radius=10000
GET  http://localhost:8000/api/v1/businesses/1/services
GET  http://localhost:8000/api/v1/businesses/1/hours
GET  http://localhost:8000/api/v1/businesses/1/media
GET  http://localhost:8000/api/v1/categories
GET  http://localhost:8000/api/v1/discovery/home
GET  http://localhost:8000/api/v1/discovery/popular-searches

# Events
POST http://localhost:8000/api/v1/events
Body: { "event": "business_view", "businessId": 1 }

# Business Portal
GET  http://localhost:8000/api/v1/business/dashboard
     Authorization: Bearer {{BUSINESS_TOKEN}}
GET  http://localhost:8000/api/v1/business/profile
     Authorization: Bearer {{BUSINESS_TOKEN}}

# Admin
GET  http://localhost:8000/api/v1/admin/dashboard
     Authorization: Bearer {{ADMIN_TOKEN}}
GET  http://localhost:8000/api/v1/admin/analytics/overview
     Authorization: Bearer {{ADMIN_TOKEN}}
GET  http://localhost:8000/api/v1/admin/revenue
     Authorization: Bearer {{ADMIN_TOKEN}}
```

---

## Complete Endpoint Map

### Public
| Method | Endpoint |
|--------|----------|
| GET | /api/v1/health |
| GET | /api/v1/health/db |
| GET | /api/v1/discovery/home |
| GET | /api/v1/discovery/featured |
| GET | /api/v1/discovery/popular |
| GET | /api/v1/discovery/promotions |
| GET | /api/v1/discovery/popular-searches ✅ |
| GET | /api/v1/businesses |
| GET | /api/v1/businesses/search ✅ |
| GET | /api/v1/businesses/search/suggestions ✅ |
| GET | /api/v1/businesses/nearby ✅ |
| GET | /api/v1/businesses/:id |
| GET | /api/v1/businesses/:id/services ✅ |
| GET | /api/v1/businesses/:id/amenities ✅ |
| GET | /api/v1/businesses/:id/hours ✅ |
| GET | /api/v1/businesses/:id/media ✅ |
| GET | /api/v1/businesses/:id/promotions ✅ |
| GET | /api/v1/businesses/:id/related ✅ |
| GET | /api/v1/categories ✅ |
| GET | /api/v1/categories/:id ✅ |
| GET | /api/v1/categories/:id/businesses ✅ |
| GET | /api/v1/promotions |
| GET | /api/v1/promotions/:id |
| GET | /api/v1/locations/search |
| POST | /api/v1/events ✅ |

### Business Auth
| Method | Endpoint |
|--------|----------|
| POST | /api/v1/auth/business/register |
| POST | /api/v1/auth/business/login |
| POST | /api/v1/auth/business/logout |
| GET  | /api/v1/auth/business/me |
| POST | /api/v1/auth/business/forgot-password |
| POST | /api/v1/auth/business/reset-password |

### Business Portal
| Method | Endpoint |
|--------|----------|
| GET | /api/v1/business/dashboard ✅ |
| GET | /api/v1/business/profile ✅ |
| PUT | /api/v1/business/profile ✅ |
| PATCH | /api/v1/business/profile/contact ✅ |
| PATCH | /api/v1/business/profile/location ✅ |
| PUT | /api/v1/business/profile/hours ✅ |
| PUT | /api/v1/business/profile/services ✅ |
| PUT | /api/v1/business/profile/amenities ✅ |
| GET | /api/v1/business/media ✅ |
| POST | /api/v1/business/media ✅ |
| PATCH | /api/v1/business/media/:id ✅ |
| DELETE | /api/v1/business/media/:id ✅ |
| POST | /api/v1/business/listing/submit ✅ |
| GET | /api/v1/business/listing/status ✅ |
| POST | /api/v1/business/listing/resubmit ✅ |
| GET | /api/v1/business/promotions |
| POST | /api/v1/business/promotions |
| GET | /api/v1/business/promotions/:id |
| PUT | /api/v1/business/promotions/:id |
| DELETE | /api/v1/business/promotions/:id |
| POST | /api/v1/business/promotions/:id/submit |
| GET | /api/v1/business/analytics |
| POST | /api/v1/featured-listings/requests |
| GET | /api/v1/featured-listings/requests |
| GET | /api/v1/featured-listings/requests/:id |
| GET | /api/v1/advertisements/types |
| GET | /api/v1/advertisements/inventory ✅ |
| GET | /api/v1/advertisements |
| POST | /api/v1/advertisements |
| GET | /api/v1/advertisements/:id |
| PUT | /api/v1/advertisements/:id |
| DELETE | /api/v1/advertisements/:id |
| POST | /api/v1/advertisements/:id/submit |

### Admin
| Method | Endpoint |
|--------|----------|
| POST | /api/v1/auth/admin/login |
| POST | /api/v1/auth/admin/logout |
| GET | /api/v1/auth/admin/me |
| GET | /api/v1/admin/dashboard ✅ |
| GET | /api/v1/admin/businesses |
| POST | /api/v1/admin/businesses |
| GET | /api/v1/admin/businesses/:id |
| PATCH | /api/v1/admin/businesses/:id |
| POST | /api/v1/admin/businesses/:id/approve ✅ |
| POST | /api/v1/admin/businesses/:id/reject ✅ |
| POST | /api/v1/admin/businesses/:id/publish ✅ |
| POST | /api/v1/admin/businesses/:id/unpublish ✅ |
| POST | /api/v1/admin/businesses/:id/suspend ✅ |
| GET | /api/v1/admin/categories ✅ |
| POST | /api/v1/admin/categories ✅ |
| GET | /api/v1/admin/categories/:id ✅ |
| PUT | /api/v1/admin/categories/:id ✅ |
| DELETE | /api/v1/admin/categories/:id ✅ |
| POST | /api/v1/admin/categories/:id/enable ✅ |
| POST | /api/v1/admin/categories/:id/disable ✅ |
| GET | /api/v1/admin/promotions |
| GET | /api/v1/admin/promotions/:id |
| POST | /api/v1/admin/promotions/:id/approve |
| POST | /api/v1/admin/promotions/:id/reject |
| POST | /api/v1/admin/promotions/:id/disable |
| GET | /api/v1/admin/advertisements |
| GET | /api/v1/admin/advertisements/:id |
| POST | /api/v1/admin/advertisements/:id/approve |
| POST | /api/v1/admin/advertisements/:id/reject |
| POST | /api/v1/admin/advertisements/:id/activate |
| POST | /api/v1/admin/advertisements/:id/pause |
| GET | /api/v1/admin/featured-listings |
| GET | /api/v1/admin/featured-listings/:id |
| POST | /api/v1/admin/featured-listings/:id/approve |
| POST | /api/v1/admin/featured-listings/:id/reject |
| POST | /api/v1/admin/featured-listings/:id/activate |
| POST | /api/v1/admin/featured-listings/:id/disable |
| GET | /api/v1/admin/analytics/overview ✅ |
| GET | /api/v1/admin/analytics/traffic ✅ |
| GET | /api/v1/admin/analytics/businesses ✅ |
| GET | /api/v1/admin/analytics/categories ✅ |
| GET | /api/v1/admin/analytics/locations ✅ |
| GET | /api/v1/admin/analytics/advertising ✅ |
| GET | /api/v1/admin/analytics/revenue ✅ |
| GET | /api/v1/admin/revenue ✅ |
| GET | /api/v1/admin/revenue/summary ✅ |
| GET | /api/v1/admin/revenue/transactions ✅ |
| GET | /api/v1/admin/revenue/:id ✅ |

> ✅ = newly added in this patch
