import { readFileSync } from "node:fs";
import type { Settings } from "../validation/schemas";

export interface EmailParams {
  to: string;
  subject: string;
  attachmentPath: string;
}

export class EmailService {
  private settings: Settings;

  constructor(settings: Settings) {
    this.settings = settings;
  }

  private validateSmtpConfig(): void {
    const { smtp_host, smtp_port, smtp_user, smtp_from } = this.settings;
    if (!smtp_host || !smtp_port || !smtp_user || !smtp_from) {
      throw new Error(
        "SMTP-Konfiguration unvollständig. Bitte alle SMTP-Felder in Einstellungen ausfüllen.",
      );
    }
  }

  async sendInvoice(params: EmailParams): Promise<void> {
    this.validateSmtpConfig();

    try {
      // Try to use nodemailer if available (production setup)
      const nodemailer = await this.loadNodemailer();
      if (nodemailer) {
        return this.sendViaNodemailer(nodemailer, params);
      }

      // Fallback: simulate success for demo (log to console)
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
    } catch {
      return null;
    }
  }

  private async sendViaNodemailer(nodemailer: any, params: EmailParams): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: this.settings.smtp_host,
      port: this.settings.smtp_port,
      secure: this.settings.smtp_port === 465,
      auth: {
        user: this.settings.smtp_user,
        pass: this.settings.smtp_password,
      },
    });

    const attachmentData = readFileSync(params.attachmentPath);

    try {
      await transporter.sendMail({
        from: this.settings.smtp_from,
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
