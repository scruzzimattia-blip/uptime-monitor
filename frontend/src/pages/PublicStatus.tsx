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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = () => {
    api.get<StatusPageData>(`/status/${slug}`)
      .then((r) => { setData(r.data); setLastUpdated(new Date()); })
      .catch(() => setError("Status page not found"));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [slug]);

  if (error) {
    return (
      <div style={{
        height: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        color: "var(--text-muted)", gap: 12,
      }}>
        <div style={{ fontSize: 64, opacity: 0.3 }}>404</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Status page not found</div>
        <div style={{ fontSize: 13 }}>The page <code style={{ background: "var(--bg3)", padding: "2px 6px", borderRadius: 4 }}>{slug}</code> doesn't exist or is private.</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  const allUp   = data.monitors.every((m) => m.currentStatus === 1);
  const anyDown = data.monitors.some((m)  => m.currentStatus === 0);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      padding: "0",
      overflowY: "auto",
    }}>
      {/* Hero header */}
      <div style={{
        background: "linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%)",
        borderBottom: "1px solid var(--border)",
        padding: "40px 20px 32px",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {data.page.logoUrl && (
            <img src={data.page.logoUrl} alt="logo" style={{ height: 40, marginBottom: 18, display: "block" }} />
          )}
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.4px", marginBottom: 6 }}>
            {data.page.title}
          </h1>
          {data.page.description && (
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 20 }}>{data.page.description}</p>
          )}

          {/* Overall status banner */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 18px",
            borderRadius: 30,
            background: anyDown ? "var(--red-bg)" : "var(--green-bg)",
            border: `1px solid ${anyDown ? "rgba(240,69,90,0.25)" : "rgba(34,211,116,0.25)"}`,
            fontSize: 14,
            fontWeight: 600,
          }}>
            <StatusDot status={anyDown ? 0 : 1} size={10} pulse={!anyDown} />
            {anyDown
              ? "Some services are experiencing issues"
              : allUp
              ? "All systems operational"
              : "Checking services…"}
          </div>
        </div>
      </div>

      {/* Monitor list */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.monitors.map((m) => (
            <div key={m.id} className="card" style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <StatusDot status={m.currentStatus} size={10} pulse={m.currentStatus === 1} />
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{m.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {m.uptime30d != null && (
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      30d:{" "}
                      <strong style={{
                        color: m.uptime30d >= 99 ? "var(--green)" : m.uptime30d >= 95 ? "var(--yellow)" : "var(--red)",
                      }}>
                        {m.uptime30d}%
                      </strong>
                    </span>
                  )}
                  <span className={`badge ${m.currentStatus === 1 ? "badge-up" : m.currentStatus === 0 ? "badge-down" : "badge-pending"}`}>
                    {m.currentStatus === 1 ? "Operational" : m.currentStatus === 0 ? "Down" : "Checking"}
                  </span>
                </div>
              </div>
              <HeartbeatBar beats={m.beats} count={60} />
            </div>
          ))}
        </div>

        <div style={{
          textAlign: "center",
          marginTop: 28,
          color: "var(--text-muted)",
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
          Auto-refreshes every 60 seconds
          {lastUpdated && <> · Last updated {lastUpdated.toLocaleTimeString()}</>}
        </div>
      </div>
    </div>
  );
}
