import { useEffect, useRef, useCallback, useState } from "react";
import { WsClient } from "@/lib/ws-client";
import { config } from "@/lib/config";
import type { ClientMessage, ServerMessage } from "@graph-pi/shared";

export function useWebSocket(
  onMessage: (msg: ServerMessage) => void,
  onReconnect?: () => void,
) {
  const clientRef = useRef<WsClient | null>(null);
  // Created synchronously on first render, not inside the effect below.
  // useAgentContext's AgentProvider is an ancestor of route components like
  // GraphPage, and React fires child effects before parent effects on mount
  // — so a route's own effect calling send() (e.g. to select a graph on a
  // fresh full page load, not an in-app navigation where this was already
  // connected) could run before this hook's effect had created the client,
  // silently dropping the message via the `clientRef.current?.send(...)`
  // optional chain instead of queuing it. Eagerly creating the instance here
  // means it always exists by the time any effect — parent or child — runs.
  if (clientRef.current === null) {
    clientRef.current = new WsClient(config.wsUrl);
  }
  const onMessageRef = useRef(onMessage);
  const onReconnectRef = useRef(onReconnect);
  onMessageRef.current = onMessage;
  onReconnectRef.current = onReconnect;
  // Optimistic initial value avoids flashing a "disconnected" banner while
  // the very first connection attempt (typically sub-second) is in flight.
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const client = clientRef.current!;

    const unsubMsg = client.onMessage((msg) => {
      onMessageRef.current(msg);
    });

    const unsubReconn = client.onReconnect(() => {
      onReconnectRef.current?.();
    });

    const unsubStatus = client.onStatusChange((connected) => {
      setIsConnected(connected);
    });

    client.connect();

    return () => {
      unsubMsg();
      unsubReconn();
      unsubStatus();
      client.disconnect();
      clientRef.current = null;
    };
  }, []);

  const send = useCallback((msg: ClientMessage) => {
    clientRef.current?.send(msg);
  }, []);

  return { send, clientRef, isConnected };
}
