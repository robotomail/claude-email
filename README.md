# Robotomail Channel for Claude Code

Email channel plugin that delivers inbound emails from a [Robotomail](https://robotomail.com) inbox into a Claude Code session in real time. Claude can read and reply to emails.

## What it does

- Connects to Robotomail's SSE endpoint and listens for inbound emails
- Pushes each email into your Claude Code session as a `<channel>` event
- Claude can reply using the `reply_email` tool (threading is automatic)
- Claude can compose new emails using the `send_email` tool
- Sender allowlist prevents unwanted emails from reaching Claude

## Install

### From the Robotomail marketplace

Add the marketplace and install the plugin from within Claude Code (run each command separately):

```
/plugin marketplace add robotomail/claude-email
```

```
/plugin install robotomail@robotomail
```

Then launch with the channel enabled:

```bash
claude --dangerously-load-development-channels plugin:robotomail@robotomail
```

> The `--dangerously-load-development-channels` flag is required during the channels research preview. It will be removed once the plugin is accepted into the official Claude Code marketplace.

### From source (development)

```bash
git clone https://github.com/robotomail/claude-email.git
claude --plugin-dir ./claude-email --dangerously-load-development-channels server:robotomail
```

## Setup

### 1. Configure

Run the configure command in your Claude Code session:

```
/robotomail:configure
```

This walks you through signup (or entering an existing API key) and saves your credentials.

### 2. Allow senders

By default, all senders are blocked. Allow the addresses you want to reach Claude:

```
/robotomail:access allow jane@example.com
```

### 3. Restart and test

Restart Claude Code, then send an email to your mailbox address. It appears in your session.

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
