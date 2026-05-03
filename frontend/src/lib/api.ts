import axios from "axios";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

export interface Monitor {
  id: number;
  name: string;
  type: string;
  url: string;
  interval: number;
  timeout: number;
  retries: number;
  active: boolean;
  method: string;
  acceptedStatusCodes: string[];
  keyword: string | null;
  dnsResolveType: string | null;
  dnsResolveServer: string | null;
  maxRedirects: number;
  createdAt: string;
  updatedAt: string;
  currentStatus: 0 | 1 | null;
  lastHeartbeat: Heartbeat | null;
}

export interface Heartbeat {
  id: number;
  monitorId: number;
  status: number;
  ping: number | null;
  msg: string | null;
  time: string;
}

export interface UptimeStats {
  uptime: { "24h": number | null; "7d": number | null; "30d": number | null; "90d": number | null };
  avgPing: number | null;
}

export interface Incident {
  id: number;
  monitorId: number;
  startTime: string;
  endTime: string | null;
  cause: string | null;
}

export interface Notification {
  id: number;
  name: string;
  type: string;
  config: Record<string, unknown>;
  active: boolean;
  createdAt: string;
}

export interface StatusPage {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  logoUrl: string | null;
  public: boolean;
  createdAt: string;
}
