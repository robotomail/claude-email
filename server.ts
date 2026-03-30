#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getConfig, getStateDir } from "./config";
import { SSEClient } from "./sse";
import { sendEmail, fetchMessage } from "./send";
import { AccessControl } from "./access";
import type { SSEEvent, SendEmailInput } from "./types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const config = getConfig();
const access = new AccessControl(getStateDir());

const MAX_CONTENT_BYTES = 50_000; // 50KB truncation limit

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const mcp = new Server(
  { name: "robotomail", version: "0.1.0" },
  {
    capabilities: {
      experimental: { "claude/channel": {} },
      tools: {},
    },
    instructions: [
      'Events from the robotomail channel are inbound emails delivered as <channel source="robotomail" from="..." subject="..." rfc_message_id="..." mailbox_id="..." thread_id="...">.',
      "The tag body contains the email text with From/Subject/Date headers.",
      "Use the reply_email tool to respond. Pass the mailbox_id from the tag. For threaded replies, pass the rfc_message_id as inReplyTo.",
      "Use the send_email tool to compose a new outbound email (not a reply).",
    ].join(" "),
  },
);

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "reply_email",
      description:
        "Reply to an inbound email. Pass rfc_message_id from the channel notification as inReplyTo for threading.",
      inputSchema: {
        type: "object" as const,
        properties: {
          mailboxId: {
            type: "string",
            description: "Mailbox ID from the channel notification",
          },
          to: {
            type: "array",
            items: { type: "string" },
            description: "Recipient email addresses",
          },
          cc: {
            type: "array",
            items: { type: "string" },
            description: "CC email addresses (optional)",
          },
          subject: { type: "string", description: "Email subject" },
          bodyText: {
            type: "string",
            description: "Plain text email body",
          },
          bodyHtml: {
            type: "string",
            description: "HTML email body (optional)",
          },
          inReplyTo: {
            type: "string",
            description:
              "RFC Message-ID to reply to (rfc_message_id from the channel tag)",
          },
        },
        required: ["mailboxId", "to", "subject", "bodyText"],
      },
    },
    {
      name: "send_email",
      description:
        "Compose and send a new outbound email (not a reply to an existing thread).",
      inputSchema: {
        type: "object" as const,
        properties: {
          mailboxId: {
            type: "string",
            description: "Mailbox ID to send from",
          },
          to: {
            type: "array",
            items: { type: "string" },
            description: "Recipient email addresses",
          },
          cc: {
            type: "array",
            items: { type: "string" },
            description: "CC email addresses (optional)",
          },
          subject: { type: "string", description: "Email subject" },
          bodyText: {
            type: "string",
            description: "Plain text email body",
          },
          bodyHtml: {
            type: "string",
            description: "HTML email body (optional)",
          },
        },
        required: ["mailboxId", "to", "subject", "bodyText"],
      },
    },
  ],
}));

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (!config) {
    return {
      content: [{ type: "text" as const, text: "Robotomail is not configured. Run /robotomail:configure first." }],
      isError: true,
    };
  }

  const input = req.params.arguments as unknown as SendEmailInput;

  if (req.params.name === "reply_email" || req.params.name === "send_email") {
    const result = await sendEmail(config, input);

    if (result.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Email sent successfully.\n${JSON.stringify(result.body, null, 2)}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Email send failed (${result.status}):\n${JSON.stringify(result.body, null, 2)}`,
        },
      ],
      isError: true,
    };
  }

  throw new Error(`Unknown tool: ${req.params.name}`);
});

// ---------------------------------------------------------------------------
// SSE Event Handler
// ---------------------------------------------------------------------------

async function handleInboundEmail(event: SSEEvent): Promise<void> {
  const { data } = event;

  // Access control
  const accessResult = access.check(data.from);
  if (!accessResult.allowed) {
    if (accessResult.pairingCode) {
      console.warn(
        `[robotomail] Unknown sender ${data.from} — pairing code: ${accessResult.pairingCode}`,
      );
    }
    return; // Drop silently
  }

  // Fetch full message for RFC Message-ID and attachment info
  const msgDetails = config ? await fetchMessage(config, data.mailbox_id, data.message_id) : null;
  const rfcMessageId = msgDetails?.rfcMessageId ?? "";
  const hasAttachments = msgDetails?.hasAttachments ?? false;

  // Build content (plain text, truncated if needed)
  // Fall back to stripped HTML if no plain text part exists
  let bodyText = data.body_text;
  if (!bodyText.trim() && data.body_html) {
    bodyText = data.body_html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .trim();
  }
  let truncated = false;
  if (bodyText.length > MAX_CONTENT_BYTES) {
    bodyText = bodyText.slice(0, MAX_CONTENT_BYTES);
    truncated = true;
  }

  const contentLines = [
    `From: ${data.from}`,
    `To: ${data.to.join(", ")}`,
    `Subject: ${data.subject}`,
    `Date: ${data.received_at}`,
    hasAttachments ? "Attachments: yes (fetch via API)" : "",
    "",
    bodyText,
  ].filter(Boolean);

  if (truncated) {
    contentLines.push("\n[truncated — full message available via API]");
  }

  // Emit channel notification
  await mcp.notification({
    method: "notifications/claude/channel",
    params: {
      content: contentLines.join("\n"),
      meta: {
        from: data.from,
        subject: data.subject,
        rfc_message_id: rfcMessageId,
        thread_id: data.thread_id ?? "",
        mailbox_id: data.mailbox_id,
        mailbox_address: data.mailbox_address,
        has_attachments: String(hasAttachments),
        in_reply_to: data.in_reply_to ?? "",
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

await mcp.connect(new StdioServerTransport());

if (config) {
  const sseUrl = `${config.apiBase}/v1/events`;

  const sse = new SSEClient({
    url: sseUrl,
    apiKey: config.apiKey,
    mailboxId: config.mailboxId,
    onEvent: handleInboundEmail,
    onError: (err) => console.error("[robotomail]", err.message),
    onConnected: () => console.error("[robotomail] SSE connected"),
  });

  sse.start().catch((err) => {
    console.error("[robotomail] SSE fatal:", err);
  });

  const policy = access.getState().policy;
  if (policy === "open") {
    console.error(
      "[robotomail] WARNING: Access policy is 'open' — all senders will be forwarded to Claude. Run /robotomail:access to restrict.",
    );
  } else if (policy === "allowlist" && access.getState().allowFrom.length === 0) {
    console.error(
      "[robotomail] Access policy is 'allowlist' but no senders are allowed. Run /robotomail:access allow <email> to add senders.",
    );
  } else {
    console.error(`[robotomail] Access policy: ${policy}`);
  }
} else {
  console.error("[robotomail] Not configured. Run /robotomail:configure to set up.");
}
