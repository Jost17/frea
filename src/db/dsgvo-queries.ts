import { db } from "./schema";

export function deactivateUser(userId: number): void {
  const result = db.run("UPDATE users SET active = 0 WHERE id = ?", [userId]);
  if (result.changes === 0) {
    throw new Error(`User with ID ${userId} not found`);
  }
}
