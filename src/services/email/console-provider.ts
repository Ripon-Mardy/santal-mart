import type { EmailProvider, SendEmailInput } from "./types";

/**
 * Development default: prints the rendered email to stdout instead of
 * sending it. Lets every transactional flow (verification, order emails,
 * seller approval, ...) actually run end-to-end without a real mail
 * account configured.
 */
export class ConsoleEmailProvider implements EmailProvider {
  async send(input: SendEmailInput): Promise<void> {
    const plain = input.text ?? input.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    console.log(
      [
        "\n──────────── 📧 BazarX ConsoleEmailProvider ────────────",
        `To:      ${input.to}`,
        `Subject: ${input.subject}`,
        "Body:",
        plain,
        "──────────────────────────────────────────────────────\n",
      ].join("\n")
    );
  }
}
