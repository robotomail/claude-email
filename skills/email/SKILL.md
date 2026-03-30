---
name: email
description: Send, receive, and manage email through Robotomail's API. Use when the user wants to send an email, check their inbox, or manage mailboxes.
---

# Robotomail Email Skill

Use this skill when the user wants to send, receive, or manage email through Robotomail's API. This works without the channel plugin — it's direct API access.

## Authentication

All API calls use a Bearer token:
```
Authorization: Bearer rm_xxxxxxxxxxxx
```

API base: `https://api.robotomail.com`

## Self-onboard

If the user doesn't have an account, they can sign up via API:
```bash
curl -X POST https://api.robotomail.com/v1/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "strong-password", "slug": "myagent"}'
```

Or point them to https://robotomail.com/skill for the full self-onboarding flow.

Or use the CLI:
```bash
npx @robotomail/cli auth signup --email user@example.com --slug myagent
```

## Send email

```bash
curl -X POST https://api.robotomail.com/v1/mailboxes/{mailbox_id}/messages \
  -H "Authorization: Bearer rm_..." \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["recipient@example.com"],
    "subject": "Hello",
    "bodyText": "Plain text body",
    "bodyHtml": "<p>Optional HTML body</p>"
  }'
```

Optional fields: `cc` (string[]), `bodyHtml`, `inReplyTo` (for threading), `attachments`.

## Check inbox

```bash
curl https://api.robotomail.com/v1/mailboxes/{mailbox_id}/messages?direction=INBOUND&limit=10 \
  -H "Authorization: Bearer rm_..."
```

## Reply in a thread

Include `inReplyTo` with the RFC 5322 Message-ID from the inbound message (the `messageId` field, not the `id` field):

```bash
curl -X POST https://api.robotomail.com/v1/mailboxes/{mailbox_id}/messages \
  -H "Authorization: Bearer rm_..." \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["sender@example.com"],
    "subject": "Re: Original subject",
    "bodyText": "Reply body",
    "inReplyTo": "<original-message-id@example.com>"
  }'
```

## Listen for new email

### SSE (real-time, no public URL needed)
```bash
curl -N https://api.robotomail.com/v1/events?events=message.received \
  -H "Authorization: Bearer rm_..."
```

### CLI
```bash
npx @robotomail/cli listen --json
```

## List mailboxes

```bash
curl https://api.robotomail.com/v1/mailboxes \
  -H "Authorization: Bearer rm_..."
```

## Key conventions

- SSE/webhook event payloads use `snake_case` in the `data` object
- REST API request/response bodies use `camelCase`
- Rate limits: 30 sends/min per mailbox, 60 sends/min per account
- Daily limits: 50 sends/day (free), 1,000 sends/day (paid) per mailbox

## CLI quick reference

```bash
robotomail send --to recipient@example.com --subject "Hello" --body "Message"
robotomail messages --mailbox <id> --direction INBOUND --limit 10
robotomail listen --json
robotomail mailbox list
```
