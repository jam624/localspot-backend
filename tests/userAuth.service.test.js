import { beforeEach, describe, expect, it, vi } from "vitest";

const { execute, getConnection, sendMail } = vi.hoisted(() => ({
  execute: vi.fn(),
  getConnection: vi.fn(),
  sendMail: vi.fn().mockResolvedValue(true),
}));

vi.mock("../config/db.js", () => ({
  default: {
    execute,
    getConnection,
  },
}));

vi.mock("../utils/mailer.js", () => ({
  sendMail,
}));

import {
  createUserAccount,
  forgotUserPassword,
  loginUser,
  resetUserPassword,
  updateUserProfile,
} from "../modules/user-auth/services/userAuth.service.js";
import { hashPassword } from "../utils/auth.js";

describe("userAuth.service", () => {
  beforeEach(() => {
    execute.mockReset();
    getConnection.mockReset();
    sendMail.mockReset();
  });

  describe("createUserAccount", () => {
    it("creates a new user and returns token and public user profile", async () => {
      // 1. check existing email -> none
      execute.mockResolvedValueOnce([[]]);
      // 2. insert user -> insertId: 1
      execute.mockResolvedValueOnce([{ insertId: 1 }]);
      // 3. fetch created user
      execute.mockResolvedValueOnce([
        [
          {
            id: 1,
            name: "John Doe",
            email: "john@example.com",
            status: "active",
            created_at: "2026-01-01",
          },
        ],
      ]);

      const result = await createUserAccount({
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      });

      expect(result).toHaveProperty("token");
      expect(result.user).toEqual({
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        status: "active",
        emailVerifiedAt: undefined,
        lastLoginAt: undefined,
        createdAt: "2026-01-01",
      });
    });

    it("throws 409 conflict when email is already registered", async () => {
      execute.mockResolvedValueOnce([[{ id: 1 }]]);

      await expect(
        createUserAccount({
          name: "John Doe",
          email: "john@example.com",
          password: "password123",
        })
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe("loginUser", () => {
    it("authenticates active user and updates last login timestamp", async () => {
      const passwordHash = await hashPassword("correctPassword123");
      // findByEmail
      execute.mockResolvedValueOnce([
        [
          {
            id: 1,
            name: "John Doe",
            email: "john@example.com",
            password_hash: passwordHash,
            status: "active",
          },
        ],
      ]);
      // updateLastLogin
      execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // findById
      execute.mockResolvedValueOnce([
        [
          {
            id: 1,
            name: "John Doe",
            email: "john@example.com",
            status: "active",
            created_at: "2026-01-01",
          },
        ],
      ]);

      const result = await loginUser({
        email: "john@example.com",
        password: "correctPassword123",
      });

      expect(result).toHaveProperty("token");
      expect(result.user.id).toBe(1);
    });

    it("throws 401 on incorrect password", async () => {
      const passwordHash = await hashPassword("realPassword");
      execute.mockResolvedValueOnce([
        [{ id: 1, email: "john@example.com", password_hash: passwordHash, status: "active" }],
      ]);

      await expect(
        loginUser({
          email: "john@example.com",
          password: "wrongPassword",
        })
      ).rejects.toMatchObject({ status: 401 });
    });
  });

  describe("updateUserProfile", () => {
    it("updates user name", async () => {
      // 1. findById initial check
      execute.mockResolvedValueOnce([[{ id: 1, email: "john@example.com", status: "active" }]]);
      // 2. update name
      execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 3. findById refreshed
      execute.mockResolvedValueOnce([
        [
          {
            id: 1,
            name: "Updated Name",
            email: "john@example.com",
            status: "active",
            created_at: "2026-01-01",
          },
        ],
      ]);

      const result = await updateUserProfile(1, { name: "Updated Name" });
      expect(result.user.name).toBe("Updated Name");
    });
  });

  describe("forgotUserPassword", () => {
    it("generates a token and sends an email when user exists", async () => {
      execute.mockResolvedValueOnce([
        [{ id: 1, name: "John", email: "john@example.com", status: "active" }],
      ]);
      execute.mockResolvedValueOnce([{ insertId: 1 }]);

      await forgotUserPassword("john@example.com");

      expect(execute).toHaveBeenCalledTimes(2);
    });
  });

  describe("resetUserPassword", () => {
    it("updates password and marks token used within a transaction", async () => {
      const mockConn = {
        beginTransaction: vi.fn(),
        execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
      };
      getConnection.mockResolvedValue(mockConn);

      execute.mockResolvedValueOnce([
        [{ id: 10, account_type: "user", user_id: 1, token_hash: "hash" }],
      ]);

      await resetUserPassword("dummy-token-value", "newPassword123");

      expect(mockConn.beginTransaction).toHaveBeenCalled();
      expect(mockConn.commit).toHaveBeenCalled();
      expect(mockConn.release).toHaveBeenCalled();
    });
  });
});
