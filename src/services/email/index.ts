import "server-only";

import type { EmailProvider } from "./types";
import { ConsoleEmailProvider } from "./console-provider";
import { SmtpEmailProvider } from "./smtp-provider";
import { emailTemplates } from "./templates";

export type { EmailProvider, SendEmailInput } from "./types";
export { emailTemplates };

let cached: EmailProvider | undefined;

export function getEmailService(): EmailProvider {
  if (cached) return cached;
  cached = process.env.EMAIL_SERVER_HOST ? new SmtpEmailProvider() : new ConsoleEmailProvider();
  return cached;
}

export async function sendTemplateEmail(to: string, template: { subject: string; html: string }) {
  await getEmailService().send({ to, ...template });
}
