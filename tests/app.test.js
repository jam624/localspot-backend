import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../app.js";

describe("health endpoints", () => {
  it("returns the service status from /health", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "localspot-api",
    });
  });

  it("returns the service status from /api/v1/health", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "localspot-api",
    });
  });
});

describe("documentation endpoints", () => {
  it("serves valid OpenAPI specification from /api/docs.json", async () => {
    const response = await request(app).get("/api/docs.json");

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe("3.0.3");
    expect(response.body.info.title).toBe("Localspot API");
    expect(Object.keys(response.body.paths).length).toBeGreaterThan(50);
  });
});

const protectedEndpoints = [
  ["post", "/api/v1/auth/admin/logout"],
  ["get", "/api/v1/auth/admin/me"],
  ["post", "/api/v1/auth/business/logout"],
  ["get", "/api/v1/auth/business/me"],
  ["get", "/api/v1/analytics/business"],
  ...[
    "overview",
    "traffic",
    "businesses",
    "categories",
    "locations",
    "advertising",
    "revenue",
  ].map((path) => ["get", `/api/v1/analytics/admin/${path}`]),
  ...[
    "overview",
    "traffic",
    "businesses",
    "categories",
    "locations",
    "advertising",
    "revenue",
  ].map((path) => ["get", `/api/v1/admin/analytics/${path}`]),
  ...[
    ["post", ""],
    ["get", ""],
    ["get", "/1"],
    ["put", "/1"],
    ["delete", "/1"],
    ["post", "/1/submit"],
    ["post", "/1/pause"],
    ["post", "/1/resume"],
    ["get", "/1/performance"],
  ].map(([method, path]) => [method, `/api/v1/advertisements/business${path}`]),
  ...[
    ["post", ""],
    ["get", ""],
    ["get", "/1"],
    ["put", "/1"],
    ["delete", "/1"],
    ["post", "/1/submit"],
    ["post", "/1/pause"],
    ["post", "/1/resume"],
    ["get", "/1/performance"],
  ].map(([method, path]) => [method, `/api/v1/advertisements${path}`]),
  ...[
    ["get", "/stats"],
    ["get", "/types"],
    ["post", "/types"],
    ["put", "/types/1"],
    ["get", "/slots"],
    ["post", "/slots"],
    ["put", "/slots/1"],
    ["get", ""],
    ["get", "/1"],
    ["delete", "/1"],
    ["post", "/1/approve"],
    ["post", "/1/reject"],
    ["post", "/1/activate"],
    ["post", "/1/pause"],
    ["post", "/1/disable"],
    ["patch", "/1/status"],
  ].map(([method, path]) => [method, `/api/v1/advertisements/admin${path}`]),
  ...[
    ["get", ""],
    ["get", "/stats"],
    ["get", "/types"],
    ["post", "/types"],
    ["put", "/types/1"],
    ["get", "/slots"],
    ["post", "/slots"],
    ["put", "/slots/1"],
    ["get", "/1"],
    ["delete", "/1"],
    ["post", "/1/approve"],
    ["post", "/1/reject"],
    ["post", "/1/activate"],
    ["post", "/1/pause"],
    ["post", "/1/disable"],
    ["patch", "/1/status"],
  ].map(([method, path]) => [method, `/api/v1/admin/advertisements${path}`]),
  ...[
    ["post", ""],
    ["get", ""],
    ["get", "/1"],
    ["patch", "/1"],
    ["post", "/1/submit"],
  ].map(([method, path]) => [method, `/api/v1/portal/businesses${path}`]),
  ...[
    ["get", ""],
    ["post", ""],
    ["get", "/1"],
    ["patch", "/1"],
    ["patch", "/1/status"],
    ["patch", "/1/active"],
  ].map(([method, path]) => [method, `/api/v1/admin/businesses${path}`]),
  ...[
    ["post", "/1/approve"],
    ["post", "/1/reject"],
    ["post", "/1/publish"],
    ["post", "/1/unpublish"],
    ["post", "/1/suspend"],
    ["delete", "/1"],
  ].map(([method, path]) => [method, `/api/v1/admin/businesses${path}`]),
  ...[
    ["get", "/dashboard"],
    ["get", "/profile"],
    ["put", "/profile"],
    ["patch", "/profile/contact"],
    ["patch", "/profile/location"],
    ["put", "/profile/hours"],
    ["put", "/profile/services"],
    ["put", "/profile/amenities"],
    ["get", "/media"],
    ["post", "/media"],
    ["patch", "/media/1"],
    ["delete", "/media/1"],
    ["post", "/listing/submit"],
    ["get", "/listing/status"],
    ["post", "/listing/resubmit"],
  ].map(([method, path]) => [method, `/api/v1/business${path}`]),
  ...[
    ["post", ""],
    ["get", ""],
    ["get", "/1"],
  ].map(([method, path]) => [method, `/api/v1/featured-listings/requests${path}`]),
  ...[
    ["get", ""],
    ["get", "/1"],
    ["post", "/1/approve"],
    ["post", "/1/reject"],
    ["post", "/1/activate"],
    ["post", "/1/disable"],
  ].map(([method, path]) => [method, `/api/v1/admin/featured-listings${path}`]),
  ...[
    ["get", ""],
    ["post", ""],
    ["get", "/1"],
    ["put", "/1"],
    ["delete", "/1"],
    ["post", "/1/enable"],
    ["post", "/1/disable"],
  ].map(([method, path]) => [method, `/api/v1/admin/categories${path}`]),
  ...[
    ["get", "/dashboard"],
    ["get", "/revenue"],
    ["get", "/revenue/summary"],
    ["get", "/revenue/transactions"],
    ["get", "/revenue/1"],
  ].map(([method, path]) => [method, `/api/v1/admin${path}`]),
  ...[
    ["get", "/mine/all"],
    ["get", ""],
    ["post", ""],
    ["get", "/1"],
    ["put", "/1"],
    ["delete", "/1"],
    ["post", "/1/submit"],
  ].map(([method, path]) => [method, `/api/v1/business/promotions${path}`]),
  ...[
    ["get", ""],
    ["delete", "/expired"],
    ["get", "/1"],
    ["delete", "/1"],
    ["post", "/1/approve"],
    ["post", "/1/reject"],
    ["post", "/1/disable"],
  ].map(([method, path]) => [method, `/api/v1/admin/promotions${path}`]),
];

describe("protected endpoint authentication", () => {
  it.each(protectedEndpoints)(
    "%s %s rejects requests without a bearer token",
    async (method, path) => {
      const response = await request(app)[method](path);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Authentication token required" });
    }
  );
});
