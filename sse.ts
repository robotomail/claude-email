import type { InboundEmailEvent, SSEEvent } from "./types";

export interface SSEClientOptions {
  url: string;
  apiKey: string;
  mailboxId: string | null;
  onEvent: (event: SSEEvent) => void | Promise<void>;
  onError: (error: Error) => void;
  onConnected: () => void;
}

const MAX_BACKOFF_MS = 30_000;
const HEARTBEAT_TIMEOUT_MS = 60_000;
const DEDUP_BUFFER_SIZE = 200;

export class SSEClient {
  private options: SSEClientOptions;
  private lastEventId: string | null = null;
  private seenIds = new Set<string>();
  private seenIdOrder: string[] = [];
  private eventQueue: SSEEvent[] = [];
  private processing = false;
  private abortController: AbortController | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffMs = 1000;
  private stopped = false;

  constructor(options: SSEClientOptions) {
    this.options = options;
  }

  async start(): Promise<void> {
    this.stopped = false;
    await this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.abortController?.abort();
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
  }

  private async connect(): Promise<void> {
    if (this.stopped) return;

    this.abortController = new AbortController();

    // Build URL with optional filters
    const url = new URL(this.options.url);
    url.searchParams.set("events", "message.received");
    if (this.options.mailboxId) {
      url.searchParams.set("mailboxId", this.options.mailboxId);
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.options.apiKey}`,
      Accept: "text/event-stream",
    };
    if (this.lastEventId) {
      headers["Last-Event-ID"] = this.lastEventId;
    }

    try {
      const res = await fetch(url.toString(), {
        headers,
        signal: this.abortController.signal,
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          this.options.onError(
            new Error(`SSE auth failed (${res.status}). Check ROBOTOMAIL_API_KEY.`),
          );
          return; // Don't retry auth failures
        }
        throw new Error(`SSE connection failed: ${res.status}`);
      }

      if (!res.body) {
        throw new Error("SSE response has no body");
      }

      this.backoffMs = 1000; // Reset backoff on successful connect
      this.options.onConnected();
      this.resetHeartbeatTimer();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      let currentId = "";
      let currentEvent = "";
      let currentData = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        this.resetHeartbeatTimer();
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // Keep incomplete last line

        for (const line of lines) {
          if (line === "") {
            // Empty line = end of event frame
            if (currentEvent && currentData) {
              if (currentEvent === "reconnect") {
                // Server requests reconnection
                reader.cancel();
                this.scheduleReconnect(0);
                return;
              }

              if (currentEvent === "message.received") {
                this.handleEvent(currentId, currentEvent, currentData);
              }
            }
            currentId = "";
            currentEvent = "";
            currentData = "";
          } else if (line.startsWith("id: ")) {
            currentId = line.slice(4);
          } else if (line.startsWith("event: ")) {
            currentEvent = line.slice(7);
          } else if (line.startsWith("data: ")) {
            currentData += (currentData ? "\n" : "") + line.slice(6);
          } else if (line.startsWith(":")) {
            // Comment (heartbeat) — timer already reset above
          }
        }
      }

      // Stream ended normally — reconnect
      this.scheduleReconnect(1000);
    } catch (err) {
      if (this.stopped) return;
      if (err instanceof DOMException && err.name === "AbortError") return;

      this.options.onError(
        err instanceof Error ? err : new Error(String(err)),
      );
      this.scheduleReconnect(this.backoffMs);
      this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS);
    }
  }

  /**
   * Process queued events sequentially. Events are only marked as seen
   * (and lastEventId advanced) after the handler completes successfully.
   * This prevents event loss on handler failure and avoids reordering.
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;
      try {
        await this.options.onEvent(event);
        // Only commit the ID after successful handling
        if (event.id) {
          this.lastEventId = event.id;
          this.seenIds.add(event.id);
          this.seenIdOrder.push(event.id);
          while (this.seenIdOrder.length > DEDUP_BUFFER_SIZE) {
            const oldest = this.seenIdOrder.shift()!;
            this.seenIds.delete(oldest);
          }
        }
      } catch (err) {
        this.options.onError(
          err instanceof Error ? err : new Error(String(err)),
        );
        // Don't advance lastEventId — event will be replayed on reconnect
      }
    }

    this.processing = false;
  }

  private handleEvent(id: string, event: string, dataStr: string): void {
    // Dedup before parsing (cheap check)
    if (id && this.seenIds.has(id)) return;

    try {
      const envelope = JSON.parse(dataStr) as {
        event: string;
        timestamp: string;
        data: InboundEmailEvent;
      };

      const sseEvent: SSEEvent = {
        id,
        event,
        data: envelope.data,
      };

      // Enqueue for sequential processing — see processQueue()
      this.eventQueue.push(sseEvent);
      this.processQueue();
    } catch {
      this.options.onError(new Error(`Malformed SSE data: ${dataStr.slice(0, 100)}`));
    }
  }

  private resetHeartbeatTimer(): void {
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    this.heartbeatTimer = setTimeout(() => {
      // No data for 60s — force reconnect
      this.abortController?.abort();
      this.scheduleReconnect(0);
    }, HEARTBEAT_TIMEOUT_MS);
  }

  private scheduleReconnect(delayMs: number): void {
    if (this.stopped) return;
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), delayMs);
  }
}
