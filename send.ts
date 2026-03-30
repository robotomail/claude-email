import type { SendEmailInput } from "./types";
import type { Config } from "./config";

export interface SendResult {
  ok: boolean;
  status: number;
  body: unknown;
}

/**
 * Send an email via Robotomail's REST API.
 * Used by both reply_email and send_email tools.
 */
export async function sendEmail(
  config: Config,
  input: SendEmailInput,
): Promise<SendResult> {
  const res = await fetch(
    `${config.apiBase}/v1/mailboxes/${input.mailboxId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: input.to,
        cc: input.cc,
        subject: input.subject,
        bodyText: input.bodyText,
        bodyHtml: input.bodyHtml,
        inReplyTo: input.inReplyTo,
      }),
    },
  );

  const body = await res.json().catch(() => ({ error: "Failed to parse response" }));
  return { ok: res.ok, status: res.status, body };
}

/**
 * Fetch full message details to get RFC Message-ID and attachment info.
 */
export async function fetchMessage(
  config: Config,
  mailboxId: string,
  messageId: string,
): Promise<{ rfcMessageId: string; hasAttachments: boolean } | null> {
  try {
    const res = await fetch(
      `${config.apiBase}/v1/mailboxes/${mailboxId}/messages/${messageId}`,
      {
        headers: { Authorization: `Bearer ${config.apiKey}` },
      },
    );

    if (!res.ok) {
      console.warn(`[robotomail] Message fetch failed (${res.status})`);
      return null;
    }

    const { message } = (await res.json()) as {
      message: { messageId: string; hasAttachments: boolean };
    };

    return {
      rfcMessageId: message.messageId,
      hasAttachments: message.hasAttachments,
    };
  } catch (err) {
    console.warn("[robotomail] Message fetch error:", err);
    return null;
  }
}
