const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3001";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const config = {
  wsUrl: WS_URL,
  apiUrl: API_URL,
  graphApi: `${API_URL}/api/graphs`,
  nodeApi: `${API_URL}/api/nodes`,
  healthUrl: `${API_URL}/health`,
};
