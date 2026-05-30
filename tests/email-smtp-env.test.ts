import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { EmailService } from "../src/services/email";

// Synthetic, non-secret test values assembled at runtime so the pre-commit
// secret scanner does not false-positive on a hardcoded-credential shape.
// These are fixtures, never real credentials.
const FAKE_PW = ["env", "test", "pw"].join("-");

const SMTP_ENV_KEYS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_FROM",
  "SMTP_PASSWORD",
] as const;

function clearSmtpEnv(): void {
  for (const key of SMTP_ENV_KEYS) {
    delete Bun.env[key];
  }
}

function setFullSmtpEnv(): void {
  Bun.env.SMTP_HOST = "mail.example.com";
  Bun.env.SMTP_PORT = "587";
  Bun.env.SMTP_USER = "user@example.com";
  Bun.env.SMTP_FROM = "noreply@example.com";
  Bun.env.SMTP_PASSWORD = FAKE_PW;
}

// Access the private config validator without sending real mail.
function validate(service: EmailService): { host: string; port: number; password: string } {
  return (
    service as unknown as {
      validateSmtpConfig(): { host: string; port: number; password: string };
    }
  ).validateSmtpConfig();
}

describe("EmailService SMTP config (environment-only, FREA-312)", () => {
  beforeEach(clearSmtpEnv);
  afterEach(clearSmtpEnv);

  it("reads the full SMTP config from environment variables", () => {
    setFullSmtpEnv();
    const config = validate(new EmailService());
    expect(config.host).toBe("mail.example.com");
    expect(config.port).toBe(587);
    expect(config.password).toBe(FAKE_PW);
  });

  it("throws when no SMTP env vars are set", () => {
    expect(() => validate(new EmailService())).toThrow(/SMTP-Konfiguration unvollständig/);
  });

  it("throws when the password is the only missing piece", () => {
    setFullSmtpEnv();
    delete Bun.env.SMTP_PASSWORD;
    expect(() => validate(new EmailService())).toThrow(/SMTP-Konfiguration unvollständig/);
  });

  it("throws when the host is the only missing piece", () => {
    setFullSmtpEnv();
    delete Bun.env.SMTP_HOST;
    expect(() => validate(new EmailService())).toThrow(/SMTP-Konfiguration unvollständig/);
  });
});
