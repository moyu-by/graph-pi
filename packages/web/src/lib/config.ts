// Use relative URLs by default (works when Express serves the web UI).
// Override via VITE_WS_URL / VITE_API_URL env vars for dev mode.
const WS_URL = import.meta.env.VITE_WS_URL || "";
const API_URL = import.meta.env.VITE_API_URL || "";

export const config = {
  wsUrl: WS_URL || `ws://${location.host}`,
  apiUrl: API_URL || location.origin,
  graphApi: (API_URL || location.origin) + "/api/graphs",
  nodeApi: (API_URL || location.origin) + "/api/nodes",
  healthUrl: (API_URL || location.origin) + "/health",
};
