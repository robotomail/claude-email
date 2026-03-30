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

This walks you through:
- **Sign up** for a new Robotomail account, or enter an existing API key
- **Pick a mailbox** to use for the channel (free tier gives you `<slug>@robotomail.co`)
- **Set a display name** for outbound emails (e.g. "Claude Agent")
- **Allow senders** so emails can reach Claude

### 2. Allow senders

By default, all senders are blocked. Allow addresses you want to reach Claude:

```
/robotomail:access allow jane@example.com
```

### 3. Restart and test

Restart Claude Code with the channel flag, then send an email to your mailbox address. It appears in your session.

## Commands

| Command | Description |
|---------|-------------|
| `/robotomail:configure` | Set up API key, mailbox, display name, and allowed senders |
| `/robotomail:access list` | Show current access policy and allowed senders |
| `/robotomail:access allow <email>` | Allow a sender |
| `/robotomail:access deny <email>` | Remove a sender |
| `/robotomail:access policy <open\|allowlist\|pairing>` | Change access policy |
| `/robotomail:access pair <code>` | Approve a pairing request |

## Tools

| Tool | Description |
|------|-------------|
| `reply_email` | Reply to an inbound email (threaded automatically) |
| `send_email` | Compose a new outbound email |

## Access policies

### allowlist (default)

Only allowed senders reach Claude. All other emails are silently dropped. Add senders with `/robotomail:access allow <email>`.

### pairing

Unknown senders trigger a pairing code that appears in your Claude Code terminal. You approve each sender individually:

1. Someone emails your mailbox from an unknown address
2. The plugin logs: `[robotomail] Unknown sender jane@example.com — pairing code: a3f2b1`
3. You approve with: `/robotomail:access pair a3f2b1`
4. That sender is permanently added to the allowlist

This is useful when you want Claude to receive emails from people you don't know in advance but want to approve them one at a time.

### open

All senders are forwarded to Claude. Not recommended — any email to the mailbox becomes a prompt injection vector.

## Display name

Set a display name so replies from Claude show a proper sender name instead of just the email address:

```
/robotomail:access  # not the right command for this — use configure
```

During `/robotomail:configure`, you'll be asked for a display name. This calls `PATCH /v1/mailboxes/:id` with `{ "displayName": "Claude Agent" }`. Recipients will see "Claude Agent <slug@robotomail.co>" as the sender.

You can also set it directly via the API:

```bash
curl -X PATCH https://api.robotomail.com/v1/mailboxes/<MAILBOX_ID> \
  -H "Authorization: Bearer rm_..." \
  -H "Content-Type: application/json" \
  -d '{"displayName": "Claude Agent"}'
```

## Standalone skill

The plugin also includes a standalone skill at `skills/email/SKILL.md` that teaches Claude how to use Robotomail's API directly (send, check inbox, list mailboxes) without the push-based channel.

## Requirements

- [Bun](https://bun.sh) runtime (must be in your PATH)
- A [Robotomail](https://robotomail.com) account (free tier works)
- Claude Code v2.1.80+

### Installing Bun

```bash
curl -fsSL https://bun.sh/install | bash
```

Bun installs to `~/.bun/bin`. Make sure it's in your PATH by adding this to your `~/.zshrc` (or `~/.bashrc`):

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

Restart your terminal after adding it. Verify with `bun --version`.

## License

MIT
