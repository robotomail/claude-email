---
description: Set up Robotomail email channel — sign up or enter API key, pick a mailbox, save credentials
---

# /robotomail:configure

Set up the Robotomail email channel. This command handles signup (if needed), saves your API key, and selects a mailbox so the channel server can connect.

## What to do

1. If a configuration already exists at `~/.claude/channels/robotomail/.env`, show the current mailbox address and ask if they want to reconfigure. If not, stop.

2. Ask the user: **"Do you already have a Robotomail account?"**

### If they have an account

3. Ask for their API key (starts with `rm_`).

4. Validate the key by calling:
   ```
   curl -s -H "Authorization: Bearer <KEY>" https://api.robotomail.com/v1/mailboxes
   ```
   If it returns 401, the key is invalid. Ask them to try again.

5. Skip to **step 8** (mailbox selection).

### If they need to sign up

3. Ask for their email address, a password (min 8 characters), and a slug (lowercase, letters/numbers/hyphens — this becomes their mailbox address at `<slug>@robotomail.co`).

4. Create the account via the API:
   ```
   curl -s -X POST https://api.robotomail.com/v1/signup \
     -H "Content-Type: application/json" \
     -d '{"email": "<EMAIL>", "password": "<PASSWORD>", "slug": "<SLUG>"}'
   ```

5. The response includes `apiKey` and `mailbox.id`. Save both.

6. Tell the user: **"Check your email for a verification link. You need to verify before you can send email. Receiving works immediately."**

7. Skip to **step 9** (write config), using the mailbox from the signup response.

### Mailbox selection (existing accounts)

8. List the available mailboxes from the `/v1/mailboxes` response. Show each mailbox's `fullAddress` and `id`. If they only have one, use it automatically. Otherwise ask which one to use for the channel.

### Save configuration

9. Write the configuration to `~/.claude/channels/robotomail/.env`:
   ```
   ROBOTOMAIL_API_KEY=rm_xxxxxxxxxxxx
   ROBOTOMAIL_MAILBOX_ID=<selected-mailbox-id>
   ROBOTOMAIL_INBOX_ADDRESS=<selected-mailbox-address>
   ```
   Create the directory if it doesn't exist.

10. Ask the user if they want to allow any sender addresses now. If yes, write `~/.claude/channels/robotomail/access.json`:
    ```json
    {"policy": "allowlist", "allowFrom": ["their-email@example.com"]}
    ```
    Suggest they allow their own email address so they can test.

11. Tell the user to restart Claude Code with the channel enabled:
    ```
    claude --dangerously-load-development-channels server:robotomail
    ```

## Important

- Never log or display the full API key after saving it.
- The `.env` file should only be readable by the current user (chmod 600 if possible).
- The free tier includes 1 mailbox, 50 sends/day, no credit card required.
