import nodemailer, { type Transporter } from "nodemailer";

import type { EmailProvider, SendEmailInput } from "./types";

/** Activated automatically once EMAIL_SERVER_HOST is set — see getEmailService(). */
export class SmtpEmailProvider implements EmailProvider {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
      secure: Number(process.env.EMAIL_SERVER_PORT) === 465,
      auth: process.env.EMAIL_SERVER_USER
        ? { user: process.env.EMAIL_SERVER_USER, pass: process.env.EMAIL_SERVER_PASSWORD }
        : undefined,
    });
  }

  async send(input: SendEmailInput): Promise<void> {
    await this.transporter.sendMail({
      from: process.env.EMAIL_FROM ?? "BazarX <no-reply@bazarx.demo>",
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  }
}
