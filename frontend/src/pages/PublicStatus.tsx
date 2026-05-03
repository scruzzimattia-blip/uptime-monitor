import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../lib/api";
import HeartbeatBar from "../components/HeartbeatBar";
import StatusDot from "../components/StatusDot";
import type { Heartbeat } from "../lib/api";

interface StatusMonitor {
  id: number;
  name: string;
  currentStatus: 0 | 1 | null;
  beats: Heartbeat[];
  uptime30d: number | null;
}

interface StatusPageData {
  page: { title: string; description: string | null; logoUrl: string | null };
  monitors: StatusMonitor[];
}

export default function PublicStatus() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<StatusPageData | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    api.get<StatusPageData>(`/status/${slug}`)
      .then((r) => setData(r.data))
      .catch(() => setError("Status page not found"));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [slug]);

  if (error) {
    return (
      <div style={{ maxWidth: 600, margin: "80px auto", textAlign: "center", color: "var(--text-muted)" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>404</div>
        <div>{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div className="spinner" />
      </div>
    );
  }

  const allUp = data.monitors.every((m) => m.currentStatus === 1);
  const anyDown = data.monitors.some((m) => m.currentStatus === 0);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 20px", overflowY: "auto", height: "100vh" }}>
      {data.page.logoUrl && (
        <img src={data.page.logoUrl} alt="logo" style={{ height: 48, marginBottom: 20 }} />
      )}
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{data.page.title}</h1>
      {data.page.description && (
        <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>{data.page.description}</p>
      )}

      {/* Overall status banner */}
      <div style={{
        padding: "14px 18px",
        borderRadius: 8,
        marginBottom: 32,
        background: anyDown
          ? "rgba(239,68,68,0.12)"
          : "rgba(34,197,94,0.12)",
        border: `1px solid ${anyDown ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontWeight: 600,
      }}>
        <StatusDot status={anyDown ? 0 : 1} size={12} />
        {anyDown
          ? "Some services are experiencing issues"
          : allUp
          ? "All systems operational"
          : "Checking services..."}
      </div>

      {/* Monitor list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {data.monitors.map((m) => (
          <div key={m.id} className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <StatusDot status={m.currentStatus} />
                <span style={{ fontWeight: 600, fontSize: 15 }}>{m.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13 }}>
                {m.uptime30d != null && (
                  <span style={{ color: "var(--text-muted)" }}>
                    30d: <strong style={{ color: m.uptime30d >= 99 ? "var(--green)" : m.uptime30d >= 90 ? "var(--yellow)" : "var(--red)" }}>
                      {m.uptime30d}%
                    </strong>
                  </span>
                )}
                <span className={m.currentStatus === 1 ? "badge-up" : m.currentStatus === 0 ? "badge-down" : "badge-pending"}>
                  {m.currentStatus === 1 ? "UP" : m.currentStatus === 0 ? "DOWN" : "PENDING"}
                </span>
              </div>
            </div>
            <HeartbeatBar beats={m.beats} count={60} />
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 32, color: "var(--text-muted)", fontSize: 12 }}>
        Auto-refreshes every 60 seconds · Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}
