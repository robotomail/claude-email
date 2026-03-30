import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";
import type { AccessState, AccessPolicy } from "./types";

const DEFAULT_STATE: AccessState = {
  policy: "allowlist",
  allowFrom: [],
  pending: {},
};

export class AccessControl {
  private state: AccessState;
  private filePath: string;

  constructor(stateDir: string) {
    this.filePath = join(stateDir, "access.json");
    this.state = this.load();
  }

  /** Check if a sender is allowed to deliver messages. */
  check(senderEmail: string): { allowed: boolean; pairingCode?: string } {
    // Reload from disk so external changes (e.g. /robotomail:access) take effect immediately
    this.state = this.load();
    const normalized = senderEmail.toLowerCase().trim();

    switch (this.state.policy) {
      case "open":
        return { allowed: true };

      case "allowlist":
        return { allowed: this.state.allowFrom.includes(normalized) };

      case "pairing": {
        if (this.state.allowFrom.includes(normalized)) {
          return { allowed: true };
        }
        // Generate a pairing code for unknown senders
        const code = this.generatePairingCode();
        this.state.pending[code] = {
          from: normalized,
          receivedAt: new Date().toISOString(),
        };
        this.save();
        return { allowed: false, pairingCode: code };
      }
    }
  }

  /** Approve a pending pairing code. */
  approvePairing(code: string): { approved: boolean; email?: string } {
    const pending = this.state.pending[code];
    if (!pending) return { approved: false };

    if (!this.state.allowFrom.includes(pending.from)) {
      this.state.allowFrom.push(pending.from);
    }
    delete this.state.pending[code];
    this.save();
    return { approved: true, email: pending.from };
  }

  /** Add an email to the allowlist. */
  allow(email: string): void {
    const normalized = email.toLowerCase().trim();
    if (!this.state.allowFrom.includes(normalized)) {
      this.state.allowFrom.push(normalized);
      this.save();
    }
  }

  /** Remove an email from the allowlist. */
  deny(email: string): void {
    const normalized = email.toLowerCase().trim();
    this.state.allowFrom = this.state.allowFrom.filter((e) => e !== normalized);
    this.save();
  }

  /** Set the access policy. */
  setPolicy(policy: AccessPolicy): void {
    this.state.policy = policy;
    this.save();
  }

  /** Get the current state for display. */
  getState(): Readonly<AccessState> {
    return this.state;
  }

  private generatePairingCode(): string {
    // 6 alphanumeric characters, easy to type
    return randomBytes(3).toString("hex");
  }

  private load(): AccessState {
    try {
      const raw = readFileSync(this.filePath, "utf-8");
      return JSON.parse(raw) as AccessState;
    } catch {
      return { ...DEFAULT_STATE };
    }
  }

  private save(): void {
    try {
      mkdirSync(join(this.filePath, ".."), { recursive: true });
      writeFileSync(this.filePath, JSON.stringify(this.state, null, 2) + "\n");
    } catch (err) {
      console.warn("[robotomail] Failed to save access.json:", err);
    }
  }
}
