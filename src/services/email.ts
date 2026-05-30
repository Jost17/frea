import { readFile } from "node:fs/promises";

export interface EmailParams {
  to: string;
  subject: string;
  attachmentPath: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  from: string;
  password: string;
}

/**
 * SMTP configuration is read exclusively from environment variables, set at
 * deploy time. Mail credentials are never stored in or read from the database
 * (see ADR / FREA-312) — keeping the secret out of SQLite and out of any
 * rendered settings page or API response.
 */
function readSmtpConfig(): SmtpConfig {
  return {
    host: Bun.env.SMTP_HOST || "",
    port: Number.parseInt(Bun.env.SMTP_PORT || "", 10) || 0,
    user: Bun.env.SMTP_USER || "",
    from: Bun.env.SMTP_FROM || "",
    password: Bun.env.SMTP_PASSWORD || "",
  };
}

export class EmailService {
  private validateSmtpConfig(): SmtpConfig {
    const config = readSmtpConfig();
    if (!config.host || !config.port || !config.user || !config.from || !config.password) {
      throw new Error(
        "SMTP-Konfiguration unvollständig. Bitte SMTP_HOST, SMTP_PORT, SMTP_USER, " +
          "SMTP_FROM und SMTP_PASSWORD als Umgebungsvariablen setzen.",
      );
    }
    return config;
  }

  async sendInvoice(params: EmailParams): Promise<void> {
    const config = this.validateSmtpConfig();

    try {
      const nodemailer = await this.loadNodemailer();
      if (nodemailer) {
        return this.sendViaNodemailer(nodemailer, config, params);
      }

      console.warn("[email] nodemailer not installed. Simulating send...");
      console.log(`[email] Would send invoice to ${params.to}:`);
      console.log(`  Subject: ${params.subject}`);
      console.log(`  Attachment: ${params.attachmentPath}`);
    } catch (error) {
      console.error("[email] Send failed:", error);
      throw new Error(`Rechnung konnte nicht versendet werden: ${getErrorMessage(error)}`);
    }
  }

  private async loadNodemailer(): Promise<any> {
    try {
      return await import("nodemailer");
    } catch (err) {
      console.debug(
        "[email] nodemailer not available:",
        err instanceof Error ? err.message : String(err),
      );
      return null;
    }
  }

  private async sendViaNodemailer(
    nodemailer: any,
    config: SmtpConfig,
    params: EmailParams,
  ): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });

    const attachmentData = await readFile(params.attachmentPath);

    try {
      await transporter.sendMail({
        from: config.from,
        to: params.to,
        subject: params.subject,
        text: "Anbei erhalten Sie die angeforderte Rechnung.",
        attachments: [
          {
            filename: `${params.subject}.pdf`,
            content: attachmentData,
            contentType: "application/pdf",
          },
        ],
      });

      await transporter.close();
    } catch (error) {
      console.error("[email] SMTP send failed:", error);
      throw new Error(`SMTP-Fehler: ${getErrorMessage(error)}`);
    }
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
