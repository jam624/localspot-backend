import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted is required so these variables are available when vi.mock factories run
const { query, mockPoolExecute } = vi.hoisted(() => {
  const query = vi.fn();
  const mockPoolExecute = vi.fn();
  return { query, mockPoolExecute };
});

vi.mock("../config/db.js", () => ({
  query,
  default: { execute: mockPoolExecute },
}));

import {
  getUserFavorites,
  isFavorited,
  removeFavorite,
} from "../modules/favorites/favorites.service.js";

describe("favorite removal events", () => {
  beforeEach(() => {
    query.mockReset();
    mockPoolExecute.mockReset();
  });

  it("removes the user_favorites row and logs a favorite_remove event", async () => {
    // pool.execute (DELETE from user_favorites) → [{ affectedRows: 1 }]
    mockPoolExecute.mockResolvedValue([{ affectedRows: 1 }]);
    // query (INSERT INTO events)
    query.mockResolvedValue({ insertId: 1 });

    await removeFavorite(42, 77, { ipAddress: "127.0.0.1" });

    // First pool.execute call should be the DELETE from user_favorites
    expect(mockPoolExecute.mock.calls[0][0]).toContain("DELETE FROM user_favorites");
    expect(mockPoolExecute.mock.calls[0][1]).toEqual([42, 77]);

    // query call should be the INSERT INTO events with favorite_remove
    expect(query.mock.calls[0][0]).toContain("favorite_remove");
    expect(query.mock.calls[0][1]).toContain(77);
  });

  it("retrieves user favorites with pagination metadata", async () => {
    mockPoolExecute
      .mockResolvedValueOnce([[{ total: 1 }]])
      .mockResolvedValueOnce([[{ business_id: 10 }]]);
    query.mockResolvedValueOnce([
      { id: 10, name: "Cafe", slug: "cafe", city: "Port Harcourt", listing_status: "published" },
    ]);

    const result = await getUserFavorites(42, { page: 1, limit: 10 });
    expect(result.businesses).toHaveLength(1);
    expect(result.meta).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
  });

  it("checks whether a business is favorited", async () => {
    mockPoolExecute.mockResolvedValueOnce([[{ 1: 1 }]]);
    const result = await isFavorited(42, 10);
    expect(result).toBe(true);
  });
});
