import { createHash } from "node:crypto";

export function computeHash(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}
