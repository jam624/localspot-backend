import { beforeEach, describe, expect, it, vi } from "vitest";

const { execute, query } = vi.hoisted(() => ({
  execute: vi.fn(),
  query: vi.fn(),
}));

vi.mock("../config/db.js", () => ({
  default: { execute },
  query,
}));

import { searchPublic } from "../modules/Businesslisting/business.model.js";
import { searchBusinesses } from "../modules/Businesslisting/businessSubResources.js";

describe("business search filters", () => {
  beforeEach(() => {
    execute.mockReset();
    query.mockReset();
  });

  it("includes published and active listings in the primary browse query", async () => {
    execute.mockResolvedValue([[{ total: 0 }], []]);

    await searchPublic({ page: 1, limit: 20, sort: "recommended" });

    expect(execute.mock.calls[0][0]).toContain(
      "b.listing_status IN ('published', 'active')"
    );
    expect(execute.mock.calls[1][0]).toContain(
      "b.listing_status IN ('published', 'active')"
    );
  });

  it("applies the openNow filter to the dedicated search endpoint", async () => {
    query.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
    const response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    await searchBusinesses(
      { query: { q: "coffee", openNow: "true" } },
      response,
      (error) => { throw error; }
    );

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("FROM business_hours h");
    expect(sql).toContain("h.day_of_week = ?");
    expect(params).toHaveLength(6);
    expect(response.status).toHaveBeenCalledWith(200);
  });
});
