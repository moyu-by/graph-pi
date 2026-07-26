import type { ClientMessage, ServerMessage } from "@graph-pi/shared";

type MessageHandler = (msg: ServerMessage) => void;

export class WsClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();
  private onReconnectHandlers = new Set<() => void>();
  private statusHandlers = new Set<(connected: boolean) => void>();
  private url: string;
  private baseReconnectInterval: number;
  private maxReconnectInterval: number;
  private currentReconnectInterval: number;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingMessages: string[] = [];
  private connected = false;

  constructor(url: string, baseReconnectInterval = 1000, maxReconnectInterval = 15000) {
    this.url = url;
    this.baseReconnectInterval = baseReconnectInterval;
    this.maxReconnectInterval = maxReconnectInterval;
    this.currentReconnectInterval = baseReconnectInterval;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      const wasReconnect = this.connected;
      this.setConnected(true);
      // Connection succeeded — reset backoff so the *next* disconnect starts
      // retrying quickly again instead of inheriting a long-grown interval.
      this.currentReconnectInterval = this.baseReconnectInterval;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      for (const msg of this.pendingMessages) {
        this.ws!.send(msg);
      }
      this.pendingMessages = [];
      if (wasReconnect) {
        for (const handler of this.onReconnectHandlers) {
          handler();
        }
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        for (const handler of this.handlers) {
          handler(msg);
        }
      } catch {
        // ignore parse errors
      }
    };

    this.ws.onclose = () => {
      this.setConnected(false);
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.handlers.clear();
    this.onReconnectHandlers.clear();
    this.statusHandlers.clear();
    this.pendingMessages = [];
    this.connected = false;
    this.ws?.close();
    this.ws = null;
  }

  private setConnected(connected: boolean): void {
    if (this.connected === connected) return;
    this.connected = connected;
    for (const handler of this.statusHandlers) {
      handler(connected);
    }
  }

  send(msg: ClientMessage): void {
    const data = JSON.stringify(msg);
    if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      this.pendingMessages.push(data);
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onReconnect(handler: () => void): () => void {
    this.onReconnectHandlers.add(handler);
    return () => this.onReconnectHandlers.delete(handler);
  }

  /** Subscribe to connected/disconnected transitions. */
  onStatusChange(handler: (connected: boolean) => void): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  isConnected(): boolean {
    return this.connected;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = this.currentReconnectInterval;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
    // Exponential backoff for the *next* attempt if this one also fails.
    this.currentReconnectInterval = Math.min(
      this.currentReconnectInterval * 2,
      this.maxReconnectInterval
    );
  }
}
