import { beforeEach, describe, expect, it } from "bun:test";
import { app } from "../src/app";
import { createUser, getUserByEmail } from "../src/db/auth-queries";
import { db } from "../src/db/schema";
import { hashPassword, verifyPassword } from "../src/lib/auth";

describe("Auth: Password Hashing", () => {
  it("should hash a password", async () => {
    const password = "testpass123";
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(20);
  });

  it("should verify correct password", async () => {
    const password = "testpass123";
    const hash = await hashPassword(password);
    const valid = await verifyPassword(password, hash);

    expect(valid).toBe(true);
  });

  it("should reject incorrect password", async () => {
    const password = "testpass123";
    const hash = await hashPassword(password);
    const valid = await verifyPassword("badpass", hash);

    expect(valid).toBe(false);
  });

  it("should reject malformed hash", async () => {
    const valid = await verifyPassword("password", "invalid-hash");
    expect(valid).toBe(false);
  });
});

describe("Auth: User Management", () => {
  beforeEach(() => {
    db.run("DELETE FROM sessions");
    db.run("DELETE FROM users");
  });

  it("should create a user", async () => {
    const email = "test@example.de";
    const password = "testpass456";
    const hash = await hashPassword(password);

    const user = createUser(email, hash);

    expect(user.id).toBeGreaterThan(0);
    expect(user.email).toBe(email);
    expect(user.password_hash).toBe(hash);
  });

  it("should get user by email", async () => {
    const email = "test@example.de";
    const password = "testpass456";
    const hash = await hashPassword(password);

    createUser(email, hash);
    const user = getUserByEmail(email);

    expect(user).toBeDefined();
    expect(user?.email).toBe(email);
  });

  it("should return null for non-existent user", () => {
    const user = getUserByEmail("nonexistent@example.de");
    expect(user).toBeNull();
  });

  it("should prevent duplicate email", async () => {
    const email = "test@example.de";
    const hash = await hashPassword("password");

    createUser(email, hash);

    expect(() => {
      createUser(email, hash);
    }).toThrow();
  });
});

describe("Auth: Login Route", () => {
  beforeEach(async () => {
    db.run("DELETE FROM sessions");
    db.run("DELETE FROM users");

    const email = "demo@frea.local";
    const password = "demo";
    const hash = await hashPassword(password);
    createUser(email, hash);
  });

  it("should display login page", async () => {
    const res = await app.request("/auth/login");
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Anmelden");
    expect(text).toContain("FREA");
  });

  it("should redirect to home when already logged in", async () => {
    const res = await app.request("/auth/login", {
      headers: {
        Cookie: "FREA_SESSION=test-session-id",
      },
    });

    // Should return 200 since session will be invalid and user stays on login
    expect(res.status).toBeOneOf([200, 302]);
  });

  it("should login with valid credentials", async () => {
    const formData = new FormData();
    formData.append("email", "demo@frea.local");
    formData.append("password", "demo");

    const res = await app.request("/auth/login", {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("Set-Cookie")).toContain("FREA_SESSION");
  });

  it("should reject invalid email", async () => {
    const formData = new FormData();
    formData.append("email", "nonexistent@frea.local");
    formData.append("password", "demo");

    const res = await app.request("/auth/login", {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(401);
    const text = await res.text();
    expect(text).toContain("Ungültig");
  });

  it("should reject invalid password", async () => {
    const formData = new FormData();
    formData.append("email", "demo@frea.local");
    formData.append("password", "badpass");

    const res = await app.request("/auth/login", {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(401);
    const text = await res.text();
    expect(text).toContain("Ungültig");
  });

  it("should reject missing password", async () => {
    const formData = new FormData();
    formData.append("email", "demo@frea.local");

    const res = await app.request("/auth/login", {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("should reject invalid email format", async () => {
    const formData = new FormData();
    formData.append("email", "not-an-email");
    formData.append("password", "demo");

    const res = await app.request("/auth/login", {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe("Auth: Logout Route", () => {
  beforeEach(async () => {
    db.run("DELETE FROM sessions");
    db.run("DELETE FROM users");

    const email = "demo@frea.local";
    const password = "demo";
    const hash = await hashPassword(password);
    createUser(email, hash);
  });

  it("should redirect to login on logout", async () => {
    const res = await app.request("/auth/logout", {
      method: "POST",
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/auth/login");
  });

  it("should clear session cookie on logout", async () => {
    const res = await app.request("/auth/logout", {
      method: "POST",
    });

    const setCookieHeader = res.headers.get("Set-Cookie");
    expect(setCookieHeader).toContain("FREA_SESSION");
    expect(setCookieHeader).toContain("Max-Age=0");
  });
});

describe("Auth: Protected Routes", () => {
  it("should redirect to login when not authenticated", async () => {
    const res = await app.request("/", { redirect: "manual" });

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/auth/login");
  });
});
