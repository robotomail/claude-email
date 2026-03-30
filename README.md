# Robotomail Channel for Claude Code

Email channel plugin that delivers inbound emails from a [Robotomail](https://robotomail.com) inbox into a Claude Code session in real time. Claude can read and reply to emails.

## What it does

- Connects to Robotomail's SSE endpoint and listens for inbound emails
- Pushes each email into your Claude Code session as a `<channel>` event
- Claude can reply using the `reply_email` tool (threading is automatic)
- Claude can compose new emails using the `send_email` tool
- Sender allowlist prevents unwanted emails from reaching Claude

## Setup

### 1. Install

```bash
git clone https://github.com/tinybotlabs/robotomail-channel.git
cd robotomail-channel
bun install
```

### 2. Configure

Launch Claude Code with the channel and run the configure command:

```bash
claude --dangerously-load-development-channels server:robotomail
```

Then in your session:

```
/robotomail:configure
```

This walks you through signup (or entering an existing API key) and saves your credentials.

### 3. Allow senders

By default, all senders are blocked. Allow the addresses you want to reach Claude:

```
/robotomail:access allow jane@example.com
```

### 4. Restart

```bash
claude --dangerously-load-development-channels server:robotomail
```

Send an email to your mailbox address. It appears in your Claude Code session.

## Commands

| Command | Description |
|---------|-------------|
| `/robotomail:configure` | Set up API key and mailbox (includes signup) |
| `/robotomail:access list` | Show current access policy and allowed senders |
| `/robotomail:access allow <email>` | Allow a sender |
| `/robotomail:access deny <email>` | Remove a sender |
| `/robotomail:access policy <open\|allowlist\|pairing>` | Change access policy |
| `/robotomail:access pair <code>` | Approve a pairing request |

## Tools

| Tool | Description |
|------|-------------|
| `reply_email` | Reply to an inbound email (threaded) |
| `send_email` | Compose a new outbound email |

## Access policies

- **allowlist** (default) — only allowed senders reach Claude, others silently dropped
- **pairing** — unknown senders get a pairing code; approve in your session
- **open** — all senders forwarded (not recommended)

## Standalone skill

The plugin also includes a standalone skill at `skills/email/SKILL.md` that teaches Claude how to use Robotomail's API directly (send, check inbox, list mailboxes) without the push-based channel.

## Requirements

- [Bun](https://bun.sh) runtime
- A [Robotomail](https://robotomail.com) account (free tier works)
- Claude Code v2.1.80+

## License

MIT
