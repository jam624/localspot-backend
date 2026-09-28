
`/api/v1/...`

## 1. API Architecture

| Domain              | Base Endpoint               | Access                    |
| ------------------- | --------------------------- | ------------------------- |
| Health              | `/api/v1/health`            | Public                    |
| Consumer Discovery  | `/api/v1/discovery`         | Public                    | Chris ✅
| Businesses/Listings | `/api/v1/businesses`        | Public + Auth             | James
| Categories          | `/api/v1/categories`        | Public + Business + Admin | Divine
| Promotions          | `/api/v1/promotions`        | Public + Business + Admin | Seri 🟨
| Favorites           | `/api/v1/favorites`         | Public                    | Owen
| Analytics           | `/api/v1/analytics`         | Business + Admin          | Benjamin ✅
| Business Auth       | `/api/v1/auth/business`     | Public                    | ✅
| Admin Auth          | `/api/v1/auth/admin`        | Public                    | ✅
| Business Portal     | `/api/v1/business`          | Business                  | -----
| Advertising         | `/api/v1/advertisements`    | Business + Admin          | Samuel
| Featured Listings   | `/api/v1/featured-listings` | Business + Admin          | Benjamin
| Admin               | `/api/v1/admin`             | Admin                     | Chris

---

# 2. Core System / Health

### Feature: Server health

| Method | Endpoint            | Purpose                     |
| ------ | ------------------- | --------------------------- |
| GET    | `/api/v1/health`    | Check API/server health     |
| GET    | `/api/v1/health/db` | Check database connectivity |

Example:

```http
GET /api/v1/health
```

Response:

```json
{
  "status": "ok",
  "service": "localspot-api",
  "version": "1.0.0"
}
```

---
<!-- CHRIS -->


# 3. Consumer Discovery

This is the most important public API because the core hypothesis is:

**Discovery → Traffic → Visibility → Advertising → Revenue**

## Homepage

| Method | Endpoint                       | Purpose             |
| ------ | ------------------------------ | ------------------- |
| GET    | `/api/v1/discovery/home`       | Homepage data       |
| GET    | `/api/v1/discovery/featured`   | Featured businesses |
| GET    | `/api/v1/discovery/popular`    | Popular businesses  |
| GET    | `/api/v1/discovery/promotions` | Active promotions   |
| GET    | `/api/v1/discovery/categories` | Popular categories  |

Instead of making the frontend call 8–10 endpoints on page load, I'd strongly consider:

```http
GET /api/v1/discovery/home
```

returning:

```json
{
  "categories": [],
  "featuredBusinesses": [],
  "popularBusinesses": [],
  "promotions": [],
  "advertisements": []
}
```

That reduces unnecessary requests.

---
<!-- JAMES -->

# 4. Search

### Feature: Business search

```http
GET /api/v1/businesses/search
```

Query parameters:

```text
?q=restaurant
&category=restaurants
&location=GRA
&rating=4
&priceRange=2
&openNow=true
&sort=recommended
&page=1
&limit=20
```

Possible sorting:

```text
recommended
rating
popular
newest
```

### Search suggestions

```http
GET /api/v1/businesses/search/suggestions?q=rest
```

Useful for autocomplete.

### Popular searches

```http
GET /api/v1/discovery/popular-searches
```

---

<!-- DIVINE -->
# 5. Business Categories

## Public

| Method | Endpoint                                    | Purpose                   |
| ------ | ------------------------------------------- | ------------------------- |
| GET    | `/api/v1/categories`                        | Get all active categories |
| GET    | `/api/v1/categories/:categoryId`            | Get category              |
| GET    | `/api/v1/categories/:categoryId/businesses` | Businesses in category    |



Example:

```http
GET /api/v1/categories/restaurants/businesses
```

with:

```text
?page=1
&limit=20
&location=GRA
&rating=4
&openNow=true
```

---

<!-- JAMES -->
# 6. Public Business Listings

This is the core directory resource.

## Business discovery

| Method | Endpoint                                    | Purpose            |
| ------ | ------------------------------------------- | ------------------ |
| GET    | `/api/v1/businesses`                        | List businesses    |
| GET    | `/api/v1/businesses/:businessId`            | Business details   |
| GET    | `/api/v1/businesses/:businessId/services`   | Business services  |
| GET    | `/api/v1/businesses/:businessId/amenities`  | Amenities          |
| GET    | `/api/v1/businesses/:businessId/hours`      | Operating hours    |
| GET    | `/api/v1/businesses/:businessId/media`      | Gallery/images     |
| GET    | `/api/v1/businesses/:businessId/promotions` | Active promotions  |
| GET    | `/api/v1/businesses/:businessId/related`    | Similar businesses |

I would make the main endpoint sufficiently rich:

```http
GET /api/v1/businesses/:businessId
```

Response:

```json
{
  "id": "business_123",
  "name": "XYZ Restaurant",
  "description": "...",
  "category": {},
  "contact": {
    "phone": "...",
    "whatsapp": "...",
    "email": "...",
    "website": "..."
  },
  "location": {
    "address": "...",
    "city": "Port Harcourt",
    "area": "GRA",
    "latitude": 4.8,
    "longitude": 7.0
  },
  "hours": [],
  "services": [],
  "amenities": [],
  "media": [],
  "rating": 4.8,
  "priceRange": 2,
  "isFeatured": true
}
```

---

# 7. Business Contact Tracking

This is important because the PRD specifically requires analytics.

Instead of simply linking:

```html
<a href="tel:...">
```

the frontend should first register the interaction.

| Method | Endpoint                                         | Purpose              |
| ------ | ------------------------------------------------ | -------------------- |
| POST   | `/api/v1/businesses/:id/events/phone-click`      | Track phone click    |
| POST   | `/api/v1/businesses/:id/events/whatsapp-click`   | Track WhatsApp click |
| POST   | `/api/v1/businesses/:id/events/website-click`    | Track website click  |
| POST   | `/api/v1/businesses/:id/events/directions-click` | Track directions     |
| POST   | `/api/v1/businesses/:id/events/view`             | Track profile view   |
| POST   | `/api/v1/businesses/:id/events/favorite`         | Track favorite       |

A better senior-level approach, however, is a **generic event endpoint**:

```http
POST /api/v1/events
```

```json
{
  "event": "business_phone_click",
  "businessId": "business_123"
}
```

Supported events:

```text
business_view
search
phone_click
whatsapp_click
website_click
directions_click
favorite_add
favorite_remove
advertisement_impression
advertisement_click
promotion_view
```

This makes analytics much easier to extend.

---

# 8. Location / Maps

## Location search

```http
GET /api/v1/locations/search?q=GRA
```

## Businesses near coordinates

```http
GET /api/v1/businesses/nearby
```

Example:

```text
?latitude=4.8156
&longitude=7.0498
&radius=5000
```

This returns businesses within 5 km.

## Business location

Already available through:

```http
GET /api/v1/businesses/:businessId
```

No need to create a separate "map API" unless the frontend needs it.

### Directions

You don't need to implement navigation.

Frontend can construct a Google Maps/other mapping URL from:

```text
latitude
longitude
```

---

# 9. Favorites

The PRD explicitly says favorites are stored in `localStorage`.

Therefore **you don't actually need a database-backed favorites API in V1**.

The browser can maintain:

```javascript
localStorage.setItem(
  "localspot_favorites",
  JSON.stringify([...])
);
```

But for analytics, record the action:

```http
POST /api/v1/events
```

with:

```json
{
  "event": "favorite_add",
  "businessId": "123"
}
```

and:

```json
{
  "event": "favorite_remove",
  "businessId": "123"
}
```

---

# 10. Sharing

Sharing doesn't require backend endpoints.

The frontend can generate:

```text
https://localspot.com/business/xyz-restaurant
```

and use native/social sharing.

You only need to track sharing if it becomes a KPI:

```http
POST /api/v1/events
```

```json
{
  "event": "business_share",
  "businessId": "123",
  "platform": "whatsapp"
}
```

---

# 11. Business Authentication

Base:

```text
/api/v1/auth/business
```

| Method | Endpoint           | Purpose                        |
| ------ | ------------------ | ------------------------------ |
| POST   | `/register`        | Register business account      |
| POST   | `/login`           | Login                          |
| POST   | `/logout`          | Logout                         |
| POST   | `/forgot-password` | Request password reset         |
| POST   | `/reset-password`  | Reset password                 |
| GET    | `/me`              | Current authenticated business |

So:

```http
POST /api/v1/auth/business/register
```

```json
{
  "businessName": "XYZ Restaurant",
  "ownerName": "John Doe",
  "email": "john@example.com",
  "phone": "080...",
  "password": "********"
}
```

---

# 12. Business Portal

Authenticated business routes:

```text
/api/v1/business
```

## Dashboard

```http
GET /api/v1/business/dashboard
```

Returns:

```json
{
  "profileViews": 1200,
  "searchAppearances": 4500,
  "favorites": 120,
  "phoneClicks": 84,
  "whatsappClicks": 61,
  "websiteClicks": 35,
  "directionClicks": 72,
  "adImpressions": 50000,
  "adClicks": 1200
}
```

---

# 13. Business Profile Management

| Method | Endpoint                             | Purpose          |
| ------ | ------------------------------------ | ---------------- |
| GET    | `/api/v1/business/profile`           | Get own profile  |
| PUT    | `/api/v1/business/profile`           | Update profile   |
| PATCH  | `/api/v1/business/profile/contact`   | Update contact   |
| PATCH  | `/api/v1/business/profile/location`  | Update location  |
| PUT    | `/api/v1/business/profile/hours`     | Update hours     |
| PUT    | `/api/v1/business/profile/services`  | Update services  |
| PUT    | `/api/v1/business/profile/amenities` | Update amenities |

I'd keep these grouped under the authenticated business resource rather than exposing the business ID.

The server knows:

```text
req.user.businessId
```

---

# 14. Business Media

| Method | Endpoint                          | Purpose               |
| ------ | --------------------------------- | --------------------- |
| POST   | `/api/v1/business/media`          | Upload image          |
| GET    | `/api/v1/business/media`          | List media            |
| DELETE | `/api/v1/business/media/:mediaId` | Delete image          |
| PATCH  | `/api/v1/business/media/:mediaId` | Update media metadata |

Possible media types:

```text
logo
cover
gallery
advertisement
promotion
```

---

# 15. Business Listing Submission

Since the PRD defines:

```text
Draft
↓
Submitted
↓
Pending Approval
↓
Approved
↓
Published
↓
Active / Inactive
```

the API should explicitly support that lifecycle.

| Method | Endpoint                            | Purpose                   |
| ------ | ----------------------------------- | ------------------------- |
| POST   | `/api/v1/business/listing/submit`   | Submit listing            |
| GET    | `/api/v1/business/listing/status`   | View approval status      |
| POST   | `/api/v1/business/listing/resubmit` | Resubmit rejected listing |

Example:

```http
POST /api/v1/business/listing/submit
```

---

# 16. Promotions

## Public

```http
GET /api/v1/promotions
GET /api/v1/promotions/:promotionId
```

## Business

| Method | Endpoint                                 |
| ------ | ---------------------------------------- |
| GET    | `/api/v1/business/promotions` PUBLIC     |
| POST   | `/api/v1/business/promotions`            |
| GET    | `/api/v1/business/promotions/:id`        |
| PUT    | `/api/v1/business/promotions/:id`        |
| DELETE | `/api/v1/business/promotions/:id`        |
| POST   | `/api/v1/business/promotions/:id/submit` |

Promotion lifecycle:

```text
Draft
↓
Pending Approval
↓
Approved
↓
Active
↓
Expired
```

---

# 17. Featured Listings

## Business

```http
POST /api/v1/featured-listings/requests
```

```http
GET /api/v1/featured-listings/requests
```

```http
GET /api/v1/featured-listings/requests/:id
```

Business requests featured placement.

---

# 18. Advertising

This deserves its own domain because it is one of the core revenue systems.

Base:

```text
/api/v1/advertisements
```

## Business

| Method | Endpoint                            | Purpose             |
| ------ | ----------------------------------- | ------------------- |
| GET    | `/api/v1/advertisements/types`      | Available ad types  |
| GET    | `/api/v1/advertisements/inventory`  | Available ad slots  |
| POST   | `/api/v1/advertisements`            | Create campaign     |
| GET    | `/api/v1/advertisements`            | List own campaigns  |
| GET    | `/api/v1/advertisements/:id`        | Campaign details    |
| PUT    | `/api/v1/advertisements/:id`        | Update campaign     |
| DELETE | `/api/v1/advertisements/:id`        | Delete draft        |
| POST   | `/api/v1/advertisements/:id/submit` | Submit for approval |

---

# 19. Advertising Inventory

This is important from a commercial architecture perspective.

```http
GET /api/v1/advertisements/inventory
```

Could return:

```json
{
  "slots": [
    {
      "id": "homepage_top_banner",
      "name": "Homepage Top Banner",
      "type": "banner",
      "available": true
    },
    {
      "id": "category_sponsored",
      "name": "Category Sponsored Listing",
      "type": "sponsored_listing",
      "available": true
    }
  ]
}
```

This allows you to eventually turn advertising into a proper inventory system.

---

# 20. Advertisement Lifecycle

The API should support:

```text
Draft
↓
Submitted
↓
Pending Approval
↓
Approved
↓
Scheduled
↓
Active
↓
Expired
```

Admin actions:

| Method | Endpoint                                    |
| ------ | ------------------------------------------- |
| POST   | `/api/v1/admin/advertisements/:id/approve`  |
| POST   | `/api/v1/admin/advertisements/:id/reject`   |
| POST   | `/api/v1/admin/advertisements/:id/activate` |
| POST   | `/api/v1/admin/advertisements/:id/pause`    |
| POST   | `/api/v1/admin/advertisements/:id/disable`  |

---

# 21. Advertisement Tracking

Again, I'd use the generic event system:

```http
POST /api/v1/events
```

### Impression

```json
{
  "event": "advertisement_impression",
  "advertisementId": "ad_123"
}
```

### Click

```json
{
  "event": "advertisement_click",
  "advertisementId": "ad_123"
}
```

Then:

```text
CTR = clicks / impressions × 100
```

---

# 22. Business Analytics

```http
GET /api/v1/business/analytics
```

Query:

```text
?period=7d
```

or:

```text
?startDate=2026-09-01
&endDate=2026-09-15
```

Response:

```json
{
  "profile": {
    "views": 1200,
    "searchAppearances": 3400,
    "favorites": 95
  },
  "actions": {
    "phoneClicks": 50,
    "whatsappClicks": 73,
    "websiteClicks": 31,
    "directionClicks": 82
  },
  "advertising": {
    "impressions": 40000,
    "clicks": 800,
    "ctr": 2
  }
}
```

---

# 23. Admin Authentication

```text
/api/v1/auth/admin
```

| Method | Endpoint           |
| ------ | ------------------ |
| POST   | `/login`           |
| POST   | `/logout`          |
| GET    | `/me`              |
| POST   | `/forgot-password` |
| POST   | `/reset-password`  |

---

# 24. Admin Dashboard

```http
GET /api/v1/admin/dashboard
```

This should provide the high-level dashboard in one request:

```json
{
  "businesses": {},
  "traffic": {},
  "advertising": {},
  "revenue": {},
  "categories": {},
  "locations": {}
}
```

---

# 25. Admin Business Management

| Method | Endpoint                                 | Purpose                 |
| ------ | ---------------------------------------- | ----------------------- |
| GET    | `/api/v1/admin/businesses`               | List businesses         |
| POST   | `/api/v1/admin/businesses`               | Create listing manually |
| GET    | `/api/v1/admin/businesses/:id`           | View business           |
| PUT    | `/api/v1/admin/businesses/:id`           | Edit business           |
| DELETE | `/api/v1/admin/businesses/:id`           | Delete                  |
| POST   | `/api/v1/admin/businesses/:id/approve`   | Approve                 |
| POST   | `/api/v1/admin/businesses/:id/reject`    | Reject                  |
| POST   | `/api/v1/admin/businesses/:id/publish`   | Publish                 |
| POST   | `/api/v1/admin/businesses/:id/unpublish` | Unpublish               |
| POST   | `/api/v1/admin/businesses/:id/suspend`   | Suspend                 |

---

# 26. Admin Categories

| Method | Endpoint                               |
| ------ | -------------------------------------- |
| GET    | `/api/v1/admin/categories`             |
| POST   | `/api/v1/admin/categories`             |
| GET    | `/api/v1/admin/categories/:id`         |
| PUT    | `/api/v1/admin/categories/:id`         |
| DELETE | `/api/v1/admin/categories/:id`         |
| POST   | `/api/v1/admin/categories/:id/enable`  |
| POST   | `/api/v1/admin/categories/:id/disable` |

---

# 27. Admin Promotions

| Method | Endpoint                               |
| ------ | -------------------------------------- |
| GET    | `/api/v1/admin/promotions`             |
| GET    | `/api/v1/admin/promotions/:id`         |
| POST   | `/api/v1/admin/promotions/:id/approve` |
| POST   | `/api/v1/admin/promotions/:id/reject`  |
| POST   | `/api/v1/admin/promotions/:id/disable` |
| DELETE | `/api/v1/admin/promotions/:id`         |

---

# 28. Admin Advertising

| Method | Endpoint                                    |
| ------ | ------------------------------------------- |
| GET    | `/api/v1/admin/advertisements`              |
| GET    | `/api/v1/admin/advertisements/:id`          |
| POST   | `/api/v1/admin/advertisements/:id/approve`  |
| POST   | `/api/v1/admin/advertisements/:id/reject`   |
| POST   | `/api/v1/admin/advertisements/:id/activate` |
| POST   | `/api/v1/admin/advertisements/:id/pause`    |
| POST   | `/api/v1/admin/advertisements/:id/disable`  |

---

# 29. Admin Featured Listings

| Method | Endpoint                                       |
| ------ | ---------------------------------------------- |
| GET    | `/api/v1/admin/featured-listings`              |
| GET    | `/api/v1/admin/featured-listings/:id`          |
| POST   | `/api/v1/admin/featured-listings/:id/approve`  |
| POST   | `/api/v1/admin/featured-listings/:id/reject`   |
| POST   | `/api/v1/admin/featured-listings/:id/activate` |
| POST   | `/api/v1/admin/featured-listings/:id/disable`  |

---

# 30. Admin Analytics

I'd separate **dashboard summaries** from **analytics reports**.

### Overview

```http
GET /api/v1/admin/analytics/overview
```

### Traffic

```http
GET /api/v1/admin/analytics/traffic
```

### Businesses

```http
GET /api/v1/admin/analytics/businesses
```

### Categories

```http
GET /api/v1/admin/analytics/categories
```

### Locations

```http
GET /api/v1/admin/analytics/locations
```

### Advertising

```http
GET /api/v1/admin/analytics/advertising
```

### Revenue

```http
GET /api/v1/admin/analytics/revenue
```

Each should support:

```text
?startDate=2026-09-01
&endDate=2026-09-15
```

---

# 31. Revenue

Although V1 doesn't have automated payments, **don't design the database as if payments don't exist**.

Create a basic revenue/transaction domain.

```http
GET /api/v1/admin/revenue
GET /api/v1/admin/revenue/summary
GET /api/v1/admin/revenue/transactions
GET /api/v1/admin/revenue/:id
```

Eventually:

```text
Request
→ Admin Review
→ Payment Confirmation
→ Activation
```

can become:

```text
Request
→ Approval
→ Payment
→ Webhook
→ Activation
```

when Paystack/Flutterwave is introduced.

---

# 32. Recommended Complete Endpoint Map

For your students, I would reduce the whole PRD to this **backend endpoint checklist**:

### Public

```text
GET    /api/v1/health

GET    /api/v1/discovery/home
GET    /api/v1/discovery/featured
GET    /api/v1/discovery/popular
GET    /api/v1/discovery/promotions
GET    /api/v1/discovery/popular-searches

GET    /api/v1/businesses
GET    /api/v1/businesses/search
GET    /api/v1/businesses/search/suggestions
GET    /api/v1/businesses/:id
GET    /api/v1/businesses/:id/services
GET    /api/v1/businesses/:id/amenities
GET    /api/v1/businesses/:id/hours
GET    /api/v1/businesses/:id/media
GET    /api/v1/businesses/:id/promotions
GET    /api/v1/businesses/:id/related
GET    /api/v1/businesses/nearby

GET    /api/v1/categories
GET    /api/v1/categories/:id
GET    /api/v1/categories/:id/businesses

GET    /api/v1/promotions
GET    /api/v1/promotions/:id

GET    /api/v1/locations/search

POST   /api/v1/events
```

### Business Authentication

```text
POST   /api/v1/auth/business/register
POST   /api/v1/auth/business/login
POST   /api/v1/auth/business/logout
GET    /api/v1/auth/business/me
POST   /api/v1/auth/business/forgot-password
POST   /api/v1/auth/business/reset-password
```

### Business Portal

```text
GET    /api/v1/business/dashboard

GET    /api/v1/business/profile
PUT    /api/v1/business/profile
PATCH  /api/v1/business/profile/contact
PATCH  /api/v1/business/profile/location
PUT    /api/v1/business/profile/hours
PUT    /api/v1/business/profile/services
PUT    /api/v1/business/profile/amenities

POST   /api/v1/business/media
GET    /api/v1/business/media
PATCH  /api/v1/business/media/:id
DELETE /api/v1/business/media/:id

POST   /api/v1/business/listing/submit
GET    /api/v1/business/listing/status
POST   /api/v1/business/listing/resubmit

GET    /api/v1/business/promotions
POST   /api/v1/business/promotions
GET    /api/v1/business/promotions/:id
PUT    /api/v1/business/promotions/:id
DELETE /api/v1/business/promotions/:id
POST   /api/v1/business/promotions/:id/submit

GET    /api/v1/business/analytics

POST   /api/v1/featured-listings/requests
GET    /api/v1/featured-listings/requests
GET    /api/v1/featured-listings/requests/:id

GET    /api/v1/advertisements/types
GET    /api/v1/advertisements/inventory
GET    /api/v1/advertisements
POST   /api/v1/advertisements
GET    /api/v1/advertisements/:id
PUT    /api/v1/advertisements/:id
DELETE /api/v1/advertisements/:id
POST   /api/v1/advertisements/:id/submit
```

### Admin

```text
POST   /api/v1/auth/admin/login
POST   /api/v1/auth/admin/logout
GET    /api/v1/auth/admin/me

GET    /api/v1/admin/dashboard

GET    /api/v1/admin/businesses
POST   /api/v1/admin/businesses
GET    /api/v1/admin/businesses/:id
PUT    /api/v1/admin/businesses/:id
DELETE /api/v1/admin/businesses/:id
POST   /api/v1/admin/businesses/:id/approve
POST   /api/v1/admin/businesses/:id/reject
POST   /api/v1/admin/businesses/:id/publish
POST   /api/v1/admin/businesses/:id/unpublish
POST   /api/v1/admin/businesses/:id/suspend

GET    /api/v1/admin/categories
POST   /api/v1/admin/categories
GET    /api/v1/admin/categories/:id
PUT    /api/v1/admin/categories/:id
DELETE /api/v1/admin/categories/:id
POST   /api/v1/admin/categories/:id/enable
POST   /api/v1/admin/categories/:id/disable

GET    /api/v1/admin/promotions
GET    /api/v1/admin/promotions/:id
POST   /api/v1/admin/promotions/:id/approve
POST   /api/v1/admin/promotions/:id/reject
POST   /api/v1/admin/promotions/:id/disable
DELETE /api/v1/admin/promotions/:id

GET    /api/v1/admin/advertisements
GET    /api/v1/admin/advertisements/:id
POST   /api/v1/admin/advertisements/:id/approve
POST   /api/v1/admin/advertisements/:id/reject
POST   /api/v1/admin/advertisements/:id/activate
POST   /api/v1/admin/advertisements/:id/pause
POST   /api/v1/admin/advertisements/:id/disable

GET    /api/v1/admin/featured-listings
GET    /api/v1/admin/featured-listings/:id
POST   /api/v1/admin/featured-listings/:id/approve
POST   /api/v1/admin/featured-listings/:id/reject
POST   /api/v1/admin/featured-listings/:id/activate
POST   /api/v1/admin/featured-listings/:id/disable

GET    /api/v1/admin/analytics/overview
GET    /api/v1/admin/analytics/traffic
GET    /api/v1/admin/analytics/businesses
GET    /api/v1/admin/analytics/categories
GET    /api/v1/admin/analytics/locations
GET    /api/v1/admin/analytics/advertising
GET    /api/v1/admin/analytics/revenue

GET    /api/v1/admin/revenue
GET    /api/v1/admin/revenue/summary
GET    /api/v1/admin/revenue/transactions
GET    /api/v1/admin/revenue/:id
```

## 33. Senior Engineer Recommendation: Don't Build All of These First

For your **capstone backend class**, I would divide implementation into phases rather than having students attack ~100 endpoints at once.

### Phase 1 — Foundation

```text
Express
    ↓
Environment configuration
    ↓
MySQL/XAMPP
    ↓
Database connection
    ↓
Migrations/schema
    ↓
Models
    ↓
Controllers
    ↓
Routes
    ↓
Middleware
```

### Phase 2 — Core Consumer API

Build these first:

```text
GET /businesses
GET /businesses/search
GET /businesses/:id

GET /categories
GET /categories/:id/businesses

GET /promotions
GET /discovery/home

POST /events
```

### Phase 3 — Business Authentication

```text
POST /auth/business/register
POST /auth/business/login
GET  /auth/business/me
POST /auth/business/logout
```

Then protected:

```text
GET  /business/profile
PUT  /business/profile
GET  /business/dashboard
```

### Phase 4 — Business Management

```text
Business profile
Media
Services
Amenities
Hours
Promotions
Listing submission
```

### Phase 5 — Advertising

```text
Advertisements
Featured listings
Inventory
Approval workflow
Impressions
Clicks
```

### Phase 6 — Admin

```text
Admin authentication
Business approval
Category management
Promotion management
Advertisement management
Featured listing management
```

### Phase 7 — Analytics

Finally aggregate the events:

```text
business_view
search
favorite
phone_click
whatsapp_click
website_click
direction_click
ad_impression
ad_click
```

into:

```text
Business Analytics
        +
Admin Analytics
        +
Revenue Analytics
```

### The architecture I'd teach the class

```text
                    LOCALSPOT API
                         │
              ┌──────────┴──────────┐
              │                     │
           PUBLIC                AUTHENTICATED
              │                     │
       ┌──────┴──────┐       ┌──────┴────────┐
       │             │       │               │
 Discovery      Directory  Business        Admin
       │             │       │               │
 Search        Businesses  Profile        Management
 Categories    Promotions  Promotions      Approval
 Location      Events      Ads             Analytics
                         Analytics          Revenue
              │
              ▼
          MySQL Database
```

