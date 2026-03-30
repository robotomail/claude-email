# /robotomail:configure

Set up the Robotomail email channel. This command saves your API key and mailbox selection so the channel server can connect.

## What to do

1. Ask the user for their Robotomail API key (starts with `rm_`). If they don't have one, point them to https://robotomail.com/sign-up to create an account, or tell them their agent can sign up at https://robotomail.com/skill.

2. Validate the key by calling:
   ```
   curl -s -H "Authorization: Bearer <KEY>" https://api.robotomail.com/v1/mailboxes
   ```
   If it returns 401, the key is invalid.

3. List the available mailboxes from the response. Show each mailbox's `fullAddress` and `id`.

4. Ask the user which mailbox to use for the channel. If they only have one, use it automatically.

5. Write the configuration to `~/.claude/channels/robotomail/.env`:
   ```
   ROBOTOMAIL_API_KEY=rm_xxxxxxxxxxxx
   ROBOTOMAIL_MAILBOX_ID=<selected-mailbox-id>
   ROBOTOMAIL_INBOX_ADDRESS=<selected-mailbox-address>
   ```
   Create the directory if it doesn't exist.

6. Tell the user to restart Claude Code with the channel enabled:
   ```
   claude --dangerously-load-development-channels server:robotomail
   ```

## Important

- Never log or display the full API key after saving it.
- The `.env` file should only be readable by the current user (chmod 600 if possible).
- If a configuration already exists, show the current mailbox address and ask if they want to reconfigure.
