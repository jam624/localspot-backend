import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("../config/db.js", () => ({ query }));

import {
  getAdminDashboard,
  getRevenueSummary,
} from "../modules/admin-core/adminCore.service.js";

describe("admin revenue totals", () => {
  beforeEach(() => query.mockReset());

  it("counts paid transactions in the dashboard total", async () => {
    query.mockImplementation((sql) => Promise.resolve(
      String(sql).includes("revenue_transactions") ? [{ total: 42 }] : [{ total: 0 }]
    ));

    const dashboard = await getAdminDashboard();

    expect(query.mock.calls.some(([sql]) => String(sql).includes("status = 'paid'")))
      .toBe(true);
    expect(dashboard.revenue.totalCompleted).toBe(42);
  });

  it("uses statuses defined by the migration for paid and pending totals", async () => {
    query.mockImplementation((sql) => {
      if (String(sql).includes("GROUP BY transaction_type")) return Promise.resolve([]);
      if (String(sql).includes("status = 'paid'")) return Promise.resolve([{ total: 30 }]);
      if (String(sql).includes("status IN")) return Promise.resolve([{ total: 12 }]);
      return Promise.resolve([{ total: 50 }]);
    });

    const summary = await getRevenueSummary();

    expect(summary).toEqual({ total: 50, completed: 30, pending: 12, byType: [] });
    expect(query.mock.calls.some(([sql]) =>
      String(sql).includes("('requested', 'pending_review', 'pending_payment')")
    )).toBe(true);
  });
});
