import request from "supertest";
import { describe, expect, it, vi } from "vitest";

const controllerMocks = vi.hoisted(() => {
  const handlers = (namespace, names) =>
    Object.fromEntries(
      names.map((name) => [
        name,
        (_req, res) => res.status(200).json({ handler: `${namespace}.${name}` }),
      ])
    );

  return {
    adminAuth: handlers("adminAuth", [
      "forgotPassword",
      "getCurrentAdmin",
      "login",
      "logout",
      "resetPassword",
    ]),
    analytics: handlers("analytics", [
      "adminAnalyticsAdvertising",
      "adminAnalyticsBusinesses",
      "adminAnalyticsCategories",
      "adminAnalyticsLocations",
      "adminAnalyticsOverview",
      "adminAnalyticsRevenue",
      "adminAnalyticsTraffic",
      "businessAnalytics",
    ]),
    advertisement: handlers("advertisement", [
      "adminAdvertisementStats",
      "adminApproveAdvertisement",
      "adminCreateAdvertisementSlot",
      "adminCreateAdvertisementType",
      "adminDeleteAdvertisement",
      "adminGetAdvertisement",
      "adminListAdvertisements",
      "adminListAdvertisementSlots",
      "adminListAdvertisementTypes",
      "adminActivateAdvertisement",
      "adminPauseAdvertisement",
      "adminDisableAdvertisement",
      "adminRejectAdvertisement",
      "adminSetAdvertisementStatus",
      "adminUpdateAdvertisementSlot",
      "adminUpdateAdvertisementType",
      "createAdvertisement",
      "deleteMyAdvertisement",
      "getMyAdvertisement",
      "getMyAdvertisementPerformance",
      "listAdvertisementSlots",
      "listAdvertisementTypes",
      "listMyAdvertisements",
      "pauseMyAdvertisement",
      "resumeMyAdvertisement",
      "submitMyAdvertisement",
      "updateMyAdvertisement",
    ]),
    businessAuth: handlers("businessAuth", [
      "forgotPassword",
      "getCurrentBusinessAccount",
      "loginBusiness",
      "logoutBusiness",
      "registerBusinessAccount",
      "resetPassword",
    ]),
    business: {
      ...handlers("business", [
        "adminCreate",
        "adminGet",
        "adminList",
        "adminSetActive",
        "adminSetStatus",
        "adminUpdate",
        "createMine",
        "getBySlug",
        "getMine",
        "listBusinesses",
        "listMine",
        "submitMine",
        "updateMine",
      ]),
      adminSetStatus: vi.fn((req, res) =>
        res.status(200).json({ handler: "business.adminSetStatus" })
      ),
    },
    businessResources: handlers("businessResources", [
      "getNearby",
      "searchBusinesses",
      "searchSuggestions",
      "getServices",
      "getAmenities",
      "getHours",
      "getMedia",
      "getBusinessPromotions",
      "getRelatedBusinesses",
    ]),
    businessPortal: handlers("businessPortal", [
      "dashboard",
      "getProfileCtrl",
      "updateProfileCtrl",
      "updateContactCtrl",
      "updateLocationCtrl",
      "updateHoursCtrl",
      "updateServicesCtrl",
      "updateAmenitiesCtrl",
      "listMediaCtrl",
      "addMediaCtrl",
      "updateMediaCtrl",
      "deleteMediaCtrl",
      "submitCtrl",
      "statusCtrl",
      "resubmitCtrl",
    ]),
    categories: handlers("categories", [
      "listCategories",
      "getCategory",
      "listCategoryBusinesses",
      "adminList",
      "adminCreate",
      "adminGet",
      "adminUpdate",
      "adminDelete",
      "adminEnable",
      "adminDisable",
    ]),
    events: handlers("events", ["recordEvent"]),
    featuredListings: handlers("featuredListings", [
      "submitRequest",
      "listMyRequests",
      "getMyRequestById",
      "adminList",
      "adminGetOne",
      "adminApprove",
      "adminReject",
      "adminActivate",
      "adminDisable",
    ]),
    discovery: handlers("discovery", [
      "getAdvertisements",
      "getCategoryBusinesses",
      "getFeatured",
      "getHome",
      "getPopular",
      "getPopularSearches",
      "getPromotions",
      "listCategories",
      "search",
    ]),
    favorites: handlers("favorites", ["favorite", "listFavorites", "unfavorite"]),
    location: handlers("location", ["locationReverse", "locationSearch"]),
    promotion: handlers("promotion", [
      "approve",
      "create",
      "disable",
      "getOne",
      "listAll",
      "listMine",
      "listPublic",
      "reject",
      "remove",
      "removeExpired",
      "submitForReview",
      "update",
    ]),
  };
});

vi.mock("../config/db.js", () => ({
  checkDatabaseConnection: vi.fn().mockResolvedValue({ ok: 1 }),
  default: {},
  query: vi.fn(),
}));

vi.mock("../middleware/rateLimiter.middleware.js", () => ({
  apiRateLimiter: (_req, _res, next) => next(),
  authRateLimiter: (_req, _res, next) => next(),
}));

vi.mock("../middleware/adminAuth.middleware.js", () => ({
  requireAdminAuth: (req, _res, next) => {
    req.admin = { id: 1, role: "super_admin" };
    next();
  },
}));

vi.mock("../middleware/businessAuth.middleware.js", () => ({
  requireBusinessAuth: (req, _res, next) => {
    req.businessAccount = { id: 1, status: "active" };
    next();
  },
}));

vi.mock("../modules/admin-auth/controllers/adminAuth.controller.js", () =>
  controllerMocks.adminAuth
);
vi.mock("../modules/analytics/controllers/analytics.controller.js", () =>
  controllerMocks.analytics
);
vi.mock("../modules/advertisement/controllers/advertisement.controller.js", () =>
  controllerMocks.advertisement
);
vi.mock("../modules/business-auth/controllers/businessAuth.controller.js", () =>
  controllerMocks.businessAuth
);
vi.mock("../modules/Businesslisting/business.controller.js", () =>
  controllerMocks.business
);
vi.mock("../modules/Businesslisting/businessSubResources.js", () =>
  controllerMocks.businessResources
);
vi.mock("../modules/business-portal/portal.controller.js", () =>
  controllerMocks.businessPortal
);
vi.mock("../modules/categories/categories.controller.js", () =>
  controllerMocks.categories
);
vi.mock("../modules/events/events.controller.js", () => controllerMocks.events);
vi.mock("../modules/featured-listings/controllers/featuredListings.controller.js", () =>
  controllerMocks.featuredListings
);
vi.mock("../modules/consumer-discovery/controllers/discovery.controller.js", () =>
  controllerMocks.discovery
);
vi.mock("../modules/consumer-discovery/popularSearches.js", () => ({
  getPopularSearches: controllerMocks.discovery.getPopularSearches,
}));
vi.mock("../modules/favorites/favorites.controller.js", () =>
  controllerMocks.favorites
);
vi.mock("../modules/admin-core/adminCore.service.js", () => ({
  getAdminDashboard: async () => ({ handler: "adminCore.getAdminDashboard" }),
  getRevenueSummary: async () => ({ handler: "adminCore.getRevenueSummary" }),
  listRevenueTransactions: async () => ({ handler: "adminCore.listRevenueTransactions" }),
  getRevenueTransaction: async () => ({ handler: "adminCore.getRevenueTransaction" }),
}));
vi.mock("../modules/location/controllers/location.controller.js", () =>
  controllerMocks.location
);
vi.mock("../modules/promotion/controllers/promotion.controller.js", () =>
  controllerMocks.promotion
);

import app from "../app.js";

const promotionPayload = {
  title: "Weekend Deal",
  description: "A special weekend offer.",
  startDate: "2027-01-01T00:00:00.000Z",
  endDate: "2027-01-31T23:59:59.000Z",
};

const endpointCases = [
  ["post", "/api/v1/auth/admin/login", "adminAuth.login", { email: "admin@example.test", password: "password123" }],
  ["post", "/api/v1/auth/admin/logout", "adminAuth.logout"],
  ["get", "/api/v1/auth/admin/me", "adminAuth.getCurrentAdmin"],
  ["post", "/api/v1/auth/admin/forgot-password", "adminAuth.forgotPassword", { email: "admin@example.test" }],
  ["post", "/api/v1/auth/admin/reset-password", "adminAuth.resetPassword", { token: "reset-token", password: "password123" }],

  ["get", "/api/v1/analytics/business", "analytics.businessAnalytics"],
  ["get", "/api/v1/analytics/admin/overview", "analytics.adminAnalyticsOverview"],
  ["get", "/api/v1/analytics/admin/traffic", "analytics.adminAnalyticsTraffic"],
  ["get", "/api/v1/analytics/admin/businesses", "analytics.adminAnalyticsBusinesses"],
  ["get", "/api/v1/analytics/admin/categories", "analytics.adminAnalyticsCategories"],
  ["get", "/api/v1/analytics/admin/locations", "analytics.adminAnalyticsLocations"],
  ["get", "/api/v1/analytics/admin/advertising", "analytics.adminAnalyticsAdvertising"],
  ["get", "/api/v1/analytics/admin/revenue", "analytics.adminAnalyticsRevenue"],
  ["get", "/api/v1/admin/analytics/overview", "analytics.adminAnalyticsOverview"],
  ["get", "/api/v1/admin/analytics/traffic", "analytics.adminAnalyticsTraffic"],
  ["get", "/api/v1/admin/analytics/businesses", "analytics.adminAnalyticsBusinesses"],
  ["get", "/api/v1/admin/analytics/categories", "analytics.adminAnalyticsCategories"],
  ["get", "/api/v1/admin/analytics/locations", "analytics.adminAnalyticsLocations"],
  ["get", "/api/v1/admin/analytics/advertising", "analytics.adminAnalyticsAdvertising"],
  ["get", "/api/v1/admin/analytics/revenue", "analytics.adminAnalyticsRevenue"],

  ["get", "/api/v1/advertisements/types", "advertisement.listAdvertisementTypes"],
  ["get", "/api/v1/advertisements/slots", "advertisement.listAdvertisementSlots"],
  ["get", "/api/v1/advertisements/inventory", "advertisement.listAdvertisementSlots"],
  ["post", "/api/v1/advertisements", "advertisement.createAdvertisement", { title: "Campaign", slot_id: 1 }],
  ["get", "/api/v1/advertisements", "advertisement.listMyAdvertisements"],
  ["get", "/api/v1/advertisements/1", "advertisement.getMyAdvertisement"],
  ["put", "/api/v1/advertisements/1", "advertisement.updateMyAdvertisement", { title: "Updated campaign" }],
  ["delete", "/api/v1/advertisements/1", "advertisement.deleteMyAdvertisement"],
  ["post", "/api/v1/advertisements/1/submit", "advertisement.submitMyAdvertisement"],
  ["post", "/api/v1/advertisements/1/pause", "advertisement.pauseMyAdvertisement"],
  ["post", "/api/v1/advertisements/1/resume", "advertisement.resumeMyAdvertisement"],
  ["get", "/api/v1/advertisements/1/performance", "advertisement.getMyAdvertisementPerformance"],
  ["post", "/api/v1/advertisements/business", "advertisement.createAdvertisement", { title: "Campaign" }],
  ["get", "/api/v1/advertisements/business", "advertisement.listMyAdvertisements"],
  ["get", "/api/v1/advertisements/business/1", "advertisement.getMyAdvertisement"],
  ["put", "/api/v1/advertisements/business/1", "advertisement.updateMyAdvertisement", { title: "Updated campaign" }],
  ["delete", "/api/v1/advertisements/business/1", "advertisement.deleteMyAdvertisement"],
  ["post", "/api/v1/advertisements/business/1/submit", "advertisement.submitMyAdvertisement"],
  ["post", "/api/v1/advertisements/business/1/pause", "advertisement.pauseMyAdvertisement"],
  ["post", "/api/v1/advertisements/business/1/resume", "advertisement.resumeMyAdvertisement"],
  ["get", "/api/v1/advertisements/business/1/performance", "advertisement.getMyAdvertisementPerformance"],
  ["get", "/api/v1/advertisements/admin/stats", "advertisement.adminAdvertisementStats"],
  ["get", "/api/v1/advertisements/admin/types", "advertisement.adminListAdvertisementTypes"],
  ["post", "/api/v1/advertisements/admin/types", "advertisement.adminCreateAdvertisementType", { name: "Banner", code: "banner" }],
  ["put", "/api/v1/advertisements/admin/types/1", "advertisement.adminUpdateAdvertisementType", { name: "Updated banner" }],
  ["get", "/api/v1/advertisements/admin/slots", "advertisement.adminListAdvertisementSlots"],
  ["post", "/api/v1/advertisements/admin/slots", "advertisement.adminCreateAdvertisementSlot", { name: "Header", identifier: "header", max_capacity: 1 }],
  ["put", "/api/v1/advertisements/admin/slots/1", "advertisement.adminUpdateAdvertisementSlot", { name: "Updated header" }],
  ["get", "/api/v1/advertisements/admin", "advertisement.adminListAdvertisements"],
  ["get", "/api/v1/advertisements/admin/1", "advertisement.adminGetAdvertisement"],
  ["delete", "/api/v1/advertisements/admin/1", "advertisement.adminDeleteAdvertisement"],
  ["post", "/api/v1/advertisements/admin/1/approve", "advertisement.adminApproveAdvertisement"],
  ["post", "/api/v1/advertisements/admin/1/reject", "advertisement.adminRejectAdvertisement", { reason: "Needs changes" }],
  ["post", "/api/v1/advertisements/admin/1/activate", "advertisement.adminActivateAdvertisement"],
  ["post", "/api/v1/advertisements/admin/1/pause", "advertisement.adminPauseAdvertisement"],
  ["post", "/api/v1/advertisements/admin/1/disable", "advertisement.adminDisableAdvertisement"],
  ["patch", "/api/v1/advertisements/admin/1/status", "advertisement.adminSetAdvertisementStatus", { status: "active" }],

  ["get", "/api/v1/admin/advertisements", "advertisement.adminListAdvertisements"],
  ["get", "/api/v1/admin/advertisements/stats", "advertisement.adminAdvertisementStats"],
  ["get", "/api/v1/admin/advertisements/types", "advertisement.adminListAdvertisementTypes"],
  ["post", "/api/v1/admin/advertisements/types", "advertisement.adminCreateAdvertisementType", { name: "Banner", code: "banner" }],
  ["put", "/api/v1/admin/advertisements/types/1", "advertisement.adminUpdateAdvertisementType", { name: "Updated banner" }],
  ["get", "/api/v1/admin/advertisements/slots", "advertisement.adminListAdvertisementSlots"],
  ["post", "/api/v1/admin/advertisements/slots", "advertisement.adminCreateAdvertisementSlot", { name: "Header", code: "header", placement: "home" }],
  ["put", "/api/v1/admin/advertisements/slots/1", "advertisement.adminUpdateAdvertisementSlot", { name: "Updated header" }],
  ["get", "/api/v1/admin/advertisements/1", "advertisement.adminGetAdvertisement"],
  ["delete", "/api/v1/admin/advertisements/1", "advertisement.adminDeleteAdvertisement"],
  ["post", "/api/v1/admin/advertisements/1/approve", "advertisement.adminApproveAdvertisement"],
  ["post", "/api/v1/admin/advertisements/1/reject", "advertisement.adminRejectAdvertisement", { reason: "Needs changes" }],
  ["post", "/api/v1/admin/advertisements/1/activate", "advertisement.adminActivateAdvertisement"],
  ["post", "/api/v1/admin/advertisements/1/pause", "advertisement.adminPauseAdvertisement"],
  ["post", "/api/v1/admin/advertisements/1/disable", "advertisement.adminDisableAdvertisement"],
  ["patch", "/api/v1/admin/advertisements/1/status", "advertisement.adminSetAdvertisementStatus", { status: "active" }],

  ["post", "/api/v1/auth/business/register", "businessAuth.registerBusinessAccount", { ownerName: "Test Owner", email: "owner@example.test", phone: "+2348000000000", password: "password123" }],
  ["post", "/api/v1/auth/business/login", "businessAuth.loginBusiness", { email: "owner@example.test", password: "password123" }],
  ["post", "/api/v1/auth/business/logout", "businessAuth.logoutBusiness"],
  ["get", "/api/v1/auth/business/me", "businessAuth.getCurrentBusinessAccount"],
  ["post", "/api/v1/auth/business/forgot-password", "businessAuth.forgotPassword", { email: "owner@example.test" }],
  ["post", "/api/v1/auth/business/reset-password", "businessAuth.resetPassword", { token: "reset-token", password: "password123" }],

  ["get", "/api/v1/businesses", "business.listBusinesses"],
  ["get", "/api/v1/businesses/nearby?latitude=6.5&longitude=3.3", "businessResources.getNearby"],
  ["get", "/api/v1/businesses/search?q=cafe", "businessResources.searchBusinesses"],
  ["get", "/api/v1/businesses/search/suggestions?q=ca", "businessResources.searchSuggestions"],
  ["get", "/api/v1/businesses/1/services", "businessResources.getServices"],
  ["get", "/api/v1/businesses/1/amenities", "businessResources.getAmenities"],
  ["get", "/api/v1/businesses/1/hours", "businessResources.getHours"],
  ["get", "/api/v1/businesses/1/media", "businessResources.getMedia"],
  ["get", "/api/v1/businesses/1/promotions", "businessResources.getBusinessPromotions"],
  ["get", "/api/v1/businesses/1/related", "businessResources.getRelatedBusinesses"],
  ["get", "/api/v1/businesses/sample-business", "business.getBySlug"],
  ["post", "/api/v1/portal/businesses", "business.createMine", { name: "Sample Business", category: 1 }],
  ["get", "/api/v1/portal/businesses", "business.listMine"],
  ["get", "/api/v1/portal/businesses/1", "business.getMine"],
  ["patch", "/api/v1/portal/businesses/1", "business.updateMine", { name: "Updated Business" }],
  ["post", "/api/v1/portal/businesses/1/submit", "business.submitMine"],
  ["get", "/api/v1/admin/businesses", "business.adminList"],
  ["post", "/api/v1/admin/businesses", "business.adminCreate", { name: "Admin Business", category: 1, owner: 1 }],
  ["get", "/api/v1/admin/businesses/1", "business.adminGet"],
  ["patch", "/api/v1/admin/businesses/1", "business.adminUpdate", { name: "Updated Admin Business" }],
  ["put", "/api/v1/admin/businesses/1", "business.adminUpdate", { name: "Updated Admin Business" }],
  ["patch", "/api/v1/admin/businesses/1/status", "business.adminSetStatus", { status: "published" }],
  ["patch", "/api/v1/admin/businesses/1/active", "business.adminSetActive", { isActive: true }],
  ["post", "/api/v1/admin/businesses/1/approve", "business.adminSetStatus"],
  ["post", "/api/v1/admin/businesses/1/reject", "business.adminSetStatus"],
  ["post", "/api/v1/admin/businesses/1/publish", "business.adminSetStatus"],
  ["post", "/api/v1/admin/businesses/1/unpublish", "business.adminSetStatus"],
  ["post", "/api/v1/admin/businesses/1/suspend", "business.adminSetStatus"],
  ["delete", "/api/v1/admin/businesses/1", "business.adminSetStatus"],

  ["post", "/api/v1/events", "events.recordEvent", { event: "business_view", businessId: 1 }],

  ["get", "/api/v1/categories", "categories.listCategories"],
  ["get", "/api/v1/categories/restaurants", "categories.getCategory"],
  ["get", "/api/v1/categories/restaurants/businesses", "categories.listCategoryBusinesses"],
  ["get", "/api/v1/admin/categories", "categories.adminList"],
  ["post", "/api/v1/admin/categories", "categories.adminCreate", { name: "Food" }],
  ["get", "/api/v1/admin/categories/1", "categories.adminGet"],
  ["put", "/api/v1/admin/categories/1", "categories.adminUpdate", { name: "Dining" }],
  ["delete", "/api/v1/admin/categories/1", "categories.adminDelete"],
  ["post", "/api/v1/admin/categories/1/enable", "categories.adminEnable"],
  ["post", "/api/v1/admin/categories/1/disable", "categories.adminDisable"],

  ["post", "/api/v1/featured-listings/requests", "featuredListings.submitRequest", { placement: "homepage_featured" }],
  ["get", "/api/v1/featured-listings/requests", "featuredListings.listMyRequests"],
  ["get", "/api/v1/featured-listings/requests/1", "featuredListings.getMyRequestById"],
  ["get", "/api/v1/admin/featured-listings", "featuredListings.adminList"],
  ["get", "/api/v1/admin/featured-listings/1", "featuredListings.adminGetOne"],
  ["post", "/api/v1/admin/featured-listings/1/approve", "featuredListings.adminApprove"],
  ["post", "/api/v1/admin/featured-listings/1/reject", "featuredListings.adminReject", { rejection_reason: "Insufficient details provided" }],
  ["post", "/api/v1/admin/featured-listings/1/activate", "featuredListings.adminActivate"],
  ["post", "/api/v1/admin/featured-listings/1/disable", "featuredListings.adminDisable"],

  ["get", "/api/v1/business/dashboard", "businessPortal.dashboard"],
  ["get", "/api/v1/business/profile", "businessPortal.getProfileCtrl"],
  ["put", "/api/v1/business/profile", "businessPortal.updateProfileCtrl", {}],
  ["patch", "/api/v1/business/profile/contact", "businessPortal.updateContactCtrl", {}],
  ["patch", "/api/v1/business/profile/location", "businessPortal.updateLocationCtrl", {}],
  ["put", "/api/v1/business/profile/hours", "businessPortal.updateHoursCtrl", {}],
  ["put", "/api/v1/business/profile/services", "businessPortal.updateServicesCtrl", {}],
  ["put", "/api/v1/business/profile/amenities", "businessPortal.updateAmenitiesCtrl", {}],
  ["get", "/api/v1/business/media", "businessPortal.listMediaCtrl"],
  ["post", "/api/v1/business/media", "businessPortal.addMediaCtrl", {}],
  ["patch", "/api/v1/business/media/1", "businessPortal.updateMediaCtrl", {}],
  ["delete", "/api/v1/business/media/1", "businessPortal.deleteMediaCtrl"],
  ["post", "/api/v1/business/listing/submit", "businessPortal.submitCtrl"],
  ["get", "/api/v1/business/listing/status", "businessPortal.statusCtrl"],
  ["post", "/api/v1/business/listing/resubmit", "businessPortal.resubmitCtrl"],

  ["get", "/api/v1/admin/dashboard", "adminCore.getAdminDashboard"],
  ["get", "/api/v1/admin/revenue", "adminCore.getRevenueSummary"],
  ["get", "/api/v1/admin/revenue/summary", "adminCore.getRevenueSummary"],
  ["get", "/api/v1/admin/revenue/transactions", "adminCore.listRevenueTransactions"],
  ["get", "/api/v1/admin/revenue/1", "adminCore.getRevenueTransaction"],

  ["get", "/api/v1/discovery/home", "discovery.getHome"],
  ["get", "/api/v1/discovery/search", "discovery.search"],
  ["get", "/api/v1/discovery/categories", "discovery.listCategories"],
  ["get", "/api/v1/discovery/category/restaurants", "discovery.getCategoryBusinesses"],
  ["get", "/api/v1/discovery/featured", "discovery.getFeatured"],
  ["get", "/api/v1/discovery/popular", "discovery.getPopular"],
  ["get", "/api/v1/discovery/promotions", "discovery.getPromotions"],
  ["get", "/api/v1/discovery/advertisements", "discovery.getAdvertisements"],
  ["get", "/api/v1/discovery/popular-searches", "discovery.getPopularSearches"],

  ["get", "/api/v1/favorites?ids=1,2", "favorites.listFavorites"],
  ["post", "/api/v1/favorites/1", "favorites.favorite"],
  ["delete", "/api/v1/favorites/1", "favorites.unfavorite"],

  ["get", "/api/v1/location/search?q=Lagos", "location.locationSearch"],
  ["get", "/api/v1/location/reverse?lat=6.5244&lon=3.3792", "location.locationReverse"],
  ["get", "/api/v1/locations/search?q=Lagos", "location.locationSearch"],
  ["get", "/api/v1/locations/reverse?lat=6.5244&lon=3.3792", "location.locationReverse"],

  ["get", "/api/v1/promotions", "promotion.listPublic"],
  ["get", "/api/v1/promotions/1", "promotion.getOne"],
  ["get", "/api/v1/business/promotions/mine/all", "promotion.listMine"],
  ["get", "/api/v1/business/promotions", "promotion.listMine"],
  ["post", "/api/v1/business/promotions", "promotion.create", promotionPayload],
  ["get", "/api/v1/business/promotions/1", "promotion.getOne"],
  ["put", "/api/v1/business/promotions/1", "promotion.update", { title: "Updated Weekend Deal" }],
  ["delete", "/api/v1/business/promotions/1", "promotion.remove"],
  ["post", "/api/v1/business/promotions/1/submit", "promotion.submitForReview"],
  ["get", "/api/v1/admin/promotions", "promotion.listAll"],
  ["delete", "/api/v1/admin/promotions/expired", "promotion.removeExpired"],
  ["get", "/api/v1/admin/promotions/1", "promotion.getOne"],
  ["delete", "/api/v1/admin/promotions/1", "promotion.remove"],
  ["post", "/api/v1/admin/promotions/1/approve", "promotion.approve"],
  ["post", "/api/v1/admin/promotions/1/reject", "promotion.reject", { reason: "Missing terms" }],
  ["post", "/api/v1/admin/promotions/1/disable", "promotion.disable"],
];

describe("API route contracts", () => {
  it("serves the database health endpoint", async () => {
    const response = await request(app).get("/api/v1/health/db");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", database: "connected" });
  });

  it("serves the Swagger UI", async () => {
    const response = await request(app).get("/api/docs/");

    expect(response.status).toBe(200);
    expect(response.text).toContain("swagger-ui");
  });

  it.each(endpointCases)(
    "%s %s invokes %s",
    async (method, path, handler, body) => {
      let responseRequest = request(app)[method](path);

      if (body) {
        responseRequest = responseRequest.send(body);
      }

      const response = await responseRequest;

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ handler });
    }
  );

  it("maps unpublish to the inactive listing state", async () => {
    await request(app).post("/api/v1/admin/businesses/1/unpublish");

    expect(controllerMocks.business.adminSetStatus.mock.calls.at(-1)[0].valid.body.status)
      .toBe("draft");
  });
});
