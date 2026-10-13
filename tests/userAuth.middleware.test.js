import { beforeEach, describe, expect, it, vi } from "vitest";

const { execute, verifyToken } = vi.hoisted(() => ({
  execute: vi.fn(),
  verifyToken: vi.fn(),
}));

vi.mock("../config/db.js", () => ({
  default: { execute },
}));

vi.mock("../utils/auth.js", () => ({
  verifyToken,
}));

import {
  optionalUserAuth,
  requireUserAuth,
} from "../middleware/userAuth.middleware.js";

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("requireUserAuth middleware", () => {
  beforeEach(() => {
    execute.mockReset();
    verifyToken.mockReset();
  });

  it("returns 401 when Authorization header is missing", async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = vi.fn();

    await requireUserAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Authentication token required" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token verification fails", async () => {
    const req = { headers: { authorization: "Bearer invalid.token" } };
    const res = mockRes();
    const next = vi.fn();
    verifyToken.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    await requireUserAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid or expired token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when token payload type is not 'user'", async () => {
    const req = { headers: { authorization: "Bearer admin.token" } };
    const res = mockRes();
    const next = vi.fn();
    verifyToken.mockReturnValue({ sub: "1", type: "admin" });

    await requireUserAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid account type" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when user is not found in database", async () => {
    const req = { headers: { authorization: "Bearer valid.token" } };
    const res = mockRes();
    const next = vi.fn();
    verifyToken.mockReturnValue({ sub: "999", type: "user" });
    execute.mockResolvedValueOnce([[]]);

    await requireUserAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Account not found" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when user is suspended or inactive", async () => {
    const req = { headers: { authorization: "Bearer valid.token" } };
    const res = mockRes();
    const next = vi.fn();
    verifyToken.mockReturnValue({ sub: "1", type: "user" });
    execute.mockResolvedValueOnce([[{ id: 1, status: "suspended" }]]);

    await requireUserAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "User account is inactive" });
    expect(next).not.toHaveBeenCalled();
  });

  it("sets req.currentUser and req.user on success", async () => {
    const req = { headers: { authorization: "Bearer valid.token" } };
    const res = mockRes();
    const next = vi.fn();
    verifyToken.mockReturnValue({ sub: "1", type: "user" });
    execute.mockResolvedValueOnce([[{ id: 1, name: "Test User", status: "active" }]]);

    await requireUserAuth(req, res, next);

    expect(req.currentUser).toEqual({ id: 1, name: "Test User", status: "active" });
    expect(req.user).toEqual({ id: 1, role: "user", type: "user" });
    expect(next).toHaveBeenCalled();
  });
});

describe("optionalUserAuth middleware", () => {
  beforeEach(() => {
    execute.mockReset();
    verifyToken.mockReset();
  });

  it("proceeds without populating req.user when no token is present", async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = vi.fn();

    await optionalUserAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it("populates req.user when a valid user token is provided", async () => {
    const req = { headers: { authorization: "Bearer valid.token" } };
    const res = mockRes();
    const next = vi.fn();
    verifyToken.mockReturnValue({ sub: "5", type: "user" });
    execute.mockResolvedValueOnce([[{ id: 5, name: "Optional User", status: "active" }]]);

    await optionalUserAuth(req, res, next);

    expect(req.user).toEqual({ id: 5, role: "user", type: "user" });
    expect(next).toHaveBeenCalled();
  });

  it("silently ignores invalid tokens and proceeds", async () => {
    const req = { headers: { authorization: "Bearer malformed.token" } };
    const res = mockRes();
    const next = vi.fn();
    verifyToken.mockImplementation(() => {
      throw new Error("Expired");
    });

    await optionalUserAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});
