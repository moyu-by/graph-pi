import { useEffect, useRef, useCallback } from "react";
import { WsClient } from "@/lib/ws-client";
import { config } from "@/lib/config";
import type { ClientMessage, ServerMessage } from "@graph-pi/shared";

export function useWebSocket(
  onMessage: (msg: ServerMessage) => void,
  onReconnect?: () => void,
) {
  const clientRef = useRef<WsClient | null>(null);
  const onMessageRef = useRef(onMessage);
  const onReconnectRef = useRef(onReconnect);
  onMessageRef.current = onMessage;
  onReconnectRef.current = onReconnect;

  useEffect(() => {
    const client = new WsClient(config.wsUrl);
    clientRef.current = client;

    const unsubMsg = client.onMessage((msg) => {
      onMessageRef.current(msg);
    });

    const unsubReconn = client.onReconnect(() => {
      onReconnectRef.current?.();
    });

    client.connect();

    return () => {
      unsubMsg();
      unsubReconn();
      client.disconnect();
      clientRef.current = null;
    };
  }, []);

  const send = useCallback((msg: ClientMessage) => {
    clientRef.current?.send(msg);
  }, []);

  return { send, clientRef };
}
