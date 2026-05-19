import { db } from "./schema";

export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: string;
  last_login: string | null;
}

export interface Session {
  id: string;
  user_id: number;
  created_at: string;
  expires_at: string;
}

export function createUser(email: string, passwordHash: string): User {
  const stmt = db.prepare<User, [string, string]>(
    "INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING *",
  );
  return stmt.get(email, passwordHash) as User;
}

export function getUserByEmail(email: string): User | null {
  const stmt = db.prepare<User, [string]>("SELECT * FROM users WHERE email = ?");
  return stmt.get(email) ?? null;
}

export function createSession(sessionId: string, userId: number, expiresAt: string): void {
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(
    sessionId,
    userId,
    expiresAt,
  );
}

export function getSession(sessionId: string): Session | null {
  const stmt = db.prepare<Session, [string, string]>(
    "SELECT * FROM sessions WHERE id = ? AND expires_at > ?",
  );
  return stmt.get(sessionId, new Date().toISOString()) ?? null;
}

export function deleteSession(sessionId: string): void {
  db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

export function getUserById(id: number): User | null {
  const stmt = db.prepare<User, [number]>("SELECT * FROM users WHERE id = ?");
  return stmt.get(id) ?? null;
}

export function updateLastLogin(userId: number): void {
  db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(userId);
}

export function updateUserPassword(userId: number, newPasswordHash: string): void {
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newPasswordHash, userId);
}

export function updateUserEmail(userId: number, newEmail: string): void {
  db.prepare("UPDATE users SET email = ? WHERE id = ?").run(newEmail, userId);
}

export function getUserCount(): number {
  const result = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM users").get();
  return result?.count ?? 0;
}

export type AuthLogAction =
  | "login_success"
  | "login_failed"
  | "logout"
  | "password_changed"
  | "email_changed";

export function insertAuthLog(
  action: AuthLogAction,
  userId: number | null,
  ipAddress?: string,
  details?: string,
): void {
  try {
    db.prepare(
      "INSERT INTO auth_log (action, user_id, ip_address, details) VALUES (?, ?, ?, ?)",
    ).run(action, userId ?? null, ipAddress ?? null, details ?? null);
  } catch (err) {
    console.error("[auth-log] Failed to insert auth log entry:", err);
  }
}
