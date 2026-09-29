import type { ConnectionStatus, Position } from "./types.js";

function toWebSocketUrl(serverUrl: string): string {
  const url = new URL(serverUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString().replace(/\/+$/, "");
}

type SimState = {
  current: Position
};

const INITIAL_RECONNECT_DELAY_MS = 500;
const MAX_RECONNECT_DELAY_MS = 10_000;

export type SimClientListener = (position: Position | null, status: ConnectionStatus) => void;

export type SimClient = {
  latestPosition: Position | null;
  status: ConnectionStatus;
  subscribe: (listener: SimClientListener) => () => void;
  close: () => void;
};

/**
 * Connects to the sensor-sim server's `/api/shared/:token/id` endpoint and keeps a
 * running "latest position" value, reconnecting with backoff on drop.
 */
export function createSimClient(serverUrl: string, token: string): SimClient {
  const listeners = new Set<SimClientListener>();
  let latestPosition: Position | null = null;
  let status: ConnectionStatus = "idle";
  let ws: WebSocket | null = null;
  let reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  const notify = () => {
    for (const listener of listeners) listener(latestPosition, status);
  };

  const setStatus = (next: ConnectionStatus) => {
    status = next;
    notify();
  };

  const scheduleReconnect = () => {
    if (closed || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
  };

  const connect = () => {
    if (closed) return;
    setStatus("connecting");

    const wsUrl = `${toWebSocketUrl(serverUrl)}/api/shared/${encodeURIComponent(token)}/ws`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
      setStatus("connected");
    };

    ws.onmessage = (event) => {
      try {
        const state = JSON.parse(event.data) as SimState;
        if (state?.current) {
          latestPosition = state.current;
          notify();
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => {
      setStatus("error");
    };

    ws.onclose = () => {
      setStatus("disconnected");
      ws = null;
      scheduleReconnect();
    };
  };

  connect();

  return {
    get latestPosition() {
      return latestPosition;
    },
    get status() {
      return status;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close() {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
      ws = null;
      listeners.clear();
    },
  };
}
