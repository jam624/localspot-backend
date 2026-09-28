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
