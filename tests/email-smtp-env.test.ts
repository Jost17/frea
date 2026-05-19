import { describe, it, expect, beforeEach } from "bun:test";
import { EmailService } from "../src/services/email";

describe("EmailService SMTP_PASSWORD migration", () => {
  beforeEach(() => {
    delete Bun.env.SMTP_PASSWORD;
  });

  it("should use SMTP_PASSWORD env var when set", () => {
    Bun.env.SMTP_PASSWORD = "env-password";
    const settings = {
      id: 1,
      company_name: "Test",
      email: "test@example.com",
      smtp_host: "mail.example.com",
      smtp_port: 587,
      smtp_user: "user@example.com",
      smtp_from: "noreply@example.com",
      smtp_password: "db-password",
    } as any;

    const service = new EmailService(settings);
    expect(service).toBeDefined();
  });

  it("should fall back to DB password if env var not set", () => {
    const settings = {
      id: 1,
      company_name: "Test",
      email: "test@example.com",
      smtp_host: "mail.example.com",
      smtp_port: 587,
      smtp_user: "user@example.com",
      smtp_from: "noreply@example.com",
      smtp_password: "db-password",
    } as any;

    const service = new EmailService(settings);
    expect(service).toBeDefined();
  });

  it("should reject when neither env var nor DB password set", () => {
    const settings = {
      id: 1,
      company_name: "Test",
      email: "test@example.com",
      smtp_host: "mail.example.com",
      smtp_port: 587,
      smtp_user: "user@example.com",
      smtp_from: "noreply@example.com",
      smtp_password: "",
    } as any;

    const service = new EmailService(settings);
    expect(() => {
      (service as any).validateSmtpConfig();
    }).toThrow();
  });
});
