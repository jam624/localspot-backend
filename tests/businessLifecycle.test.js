import { describe, expect, it } from "vitest";

import { TRANSITIONS } from "../modules/Businesslisting/business.model.js";

describe("business listing transitions", () => {
  it("allows unpublishing published listings and soft-deleting draft listings", () => {
    expect(TRANSITIONS.published).toContain("draft");
    expect(TRANSITIONS.draft).toContain("suspended");
  });

  it("allows suspending listings awaiting review", () => {
    expect(TRANSITIONS.pending_approval).toContain("suspended");
  });
});
