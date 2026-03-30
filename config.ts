import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const STATE_DIR =
  process.env.ROBOTOMAIL_STATE_DIR ??
  join(homedir(), ".claude", "channels", "robotomail");

/** Load .env file from state directory if it exists. */
function loadDotEnv(): void {
  try {
    const envPath = join(STATE_DIR, ".env");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      // Don't override existing env vars
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // No .env file — rely on shell env
  }
}

loadDotEnv();

export interface Config {
  apiKey: string;
  apiBase: string;
  mailboxId: string | null;
  stateDir: string;
}

export function getConfig(): Config {
  const apiKey = process.env.ROBOTOMAIL_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ROBOTOMAIL_API_KEY is required. Run /robotomail:configure or set it in your environment.",
    );
  }

  return {
    apiKey,
    apiBase: process.env.ROBOTOMAIL_API_BASE ?? "https://api.robotomail.com",
    mailboxId: process.env.ROBOTOMAIL_MAILBOX_ID ?? null,
    stateDir: STATE_DIR,
  };
}
