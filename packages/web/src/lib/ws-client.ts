import type { ClientMessage, ServerMessage } from "@graph-pi/shared";

type MessageHandler = (msg: ServerMessage) => void;

export class WsClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();
  private onReconnectHandlers = new Set<() => void>();
  private url: string;
  private reconnectInterval: number;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingMessages: string[] = [];
  private connected = false;

  constructor(url: string, reconnectInterval = 3000) {
    this.url = url;
    this.reconnectInterval = reconnectInterval;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      const wasReconnect = this.connected;
      this.connected = true;
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
      this.connected = false;
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
    this.pendingMessages = [];
    this.connected = false;
    this.ws?.close();
    this.ws = null;
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

  isConnected(): boolean {
    return this.connected;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectInterval);
  }
}
