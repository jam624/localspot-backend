import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("../config/db.js", () => ({ query }));

import { removeFavorite } from "../modules/favorites/favorites.service.js";

describe("favorite removal events", () => {
  beforeEach(() => query.mockReset());

  it("stores a null business reference when the listing no longer exists", async () => {
    await removeFavorite(77, { visitorId: "visitor-1" });

    expect(query.mock.calls[0][0]).toContain(
      "(SELECT id FROM businesses WHERE id = ?)"
    );
    expect(query.mock.calls[0][1]).toEqual([77, "visitor-1", null, null]);
  });
});
