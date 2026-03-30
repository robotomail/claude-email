/** SSE event data from Robotomail's message.received event (snake_case). */
export interface InboundEmailEvent {
  message_id: string;     // DB row UUID
  mailbox_id: string;
  mailbox_address: string;
  from: string;
  to: string[];
  subject: string;
  body_text: string;
  body_html: string | null;
  thread_id: string | null;
  in_reply_to: string | null;
  received_at: string;    // ISO 8601
}

/** Parsed SSE frame. */
export interface SSEEvent {
  id: string;
  event: string;
  data: InboundEmailEvent;
}

/** Full message from REST API GET /v1/mailboxes/:id/messages/:msgId (camelCase). */
export interface MessageResponse {
  message: {
    id: string;
    messageId: string;       // RFC 5322 Message-ID header
    hasAttachments: boolean;
    fromAddress: string;
    toAddresses: string[];
    subject: string;
    bodyText: string;
    bodyHtml: string | null;
    threadId: string | null;
    inReplyTo: string | null;
  };
}

/** Access control policy. */
export type AccessPolicy = "open" | "allowlist" | "pairing";

/** Persisted access control state. */
export interface AccessState {
  policy: AccessPolicy;
  allowFrom: string[];
  pending: Record<string, { from: string; receivedAt: string }>;
}

/** Reply/send email input from Claude's tool call. */
export interface SendEmailInput {
  to: string[];
  cc?: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  inReplyTo?: string;
  mailboxId: string;
}
