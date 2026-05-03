import { useState, useEffect } from "react";
import api, { type Monitor, type Heartbeat, type UptimeStats, type Incident } from "../lib/api";
import HeartbeatBar from "../components/HeartbeatBar";
import ResponseTimeChart from "../components/ResponseTimeChart";
import StatusDot from "../components/StatusDot";
import MonitorModal from "../components/MonitorModal";

interface Props {
  monitor: Monitor;
  onDeleted: () => void;
  onUpdated: () => void;
}

function UptimeColor(v: number | null) {
  if (v === null) return "var(--text-muted)";
  if (v >= 99)    return "var(--green)";
  if (v >= 95)    return "var(--yellow)";
  return "var(--red)";
}

const PERIODS = ["24h", "7d", "30d", "90d"] as const;

export default function MonitorDetail({ monitor, onDeleted, onUpdated }: Props) {
  const [heartbeats, setHeartbeats] = useState<Heartbeat[]>([]);
  const [uptime, setUptime]         = useState<UptimeStats | null>(null);
  const [incidents, setIncidents]   = useState<Incident[]>([]);
  const [editing, setEditing]       = useState(false);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<{ data: Heartbeat[] }>(`/monitors/${monitor.id}/heartbeats?limit=100`),
      api.get<UptimeStats>(`/monitors/${monitor.id}/uptime`),
      api.get<Incident[]>(`/monitors/${monitor.id}/incidents`),
    ]).then(([hb, up, inc]) => {
      setHeartbeats(hb.data.data);
      setUptime(up.data);
      setIncidents(inc.data);
    }).finally(() => setLoading(false));
  }, [monitor.id]);

  const handlePause = async () => {
    await api.post(`/monitors/${monitor.id}/pause`);
    onUpdated();
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${monitor.name}"? This cannot be undone.`)) return;
    await api.delete(`/monitors/${monitor.id}`);
    onDeleted();
  };

  const statusLabel = monitor.currentStatus === 1 ? "UP" : monitor.currentStatus === 0 ? "DOWN" : "PENDING";
  const statusClass = monitor.currentStatus === 1 ? "badge-up" : monitor.currentStatus === 0 ? "badge-down" : "badge-pending";

  const lastPing = monitor.lastHeartbeat?.ping;
  const lastChecked = monitor.lastHeartbeat
    ? new Date(monitor.lastHeartbeat.time).toLocaleTimeString()
    : null;

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner" style={{ width: 24, height: 24 }} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
      {editing && (
        <MonitorModal
          monitor={monitor}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); onUpdated(); }}
        />
      )}

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 28 }}>
        <div style={{ marginTop: 4 }}>
          <StatusDot status={monitor.currentStatus} size={12} pulse />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.3px" }}>{monitor.name}</h1>
            <span className={`badge ${statusClass}`}>{statusLabel}</span>
            {!monitor.active && <span className="badge badge-pending">PAUSED</span>}
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              background: "var(--bg3)", border: "1px solid var(--border)",
              borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700,
              color: "var(--text-muted)", letterSpacing: "0.5px",
            }}>{monitor.type.toUpperCase()}</span>
            <a href={monitor.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)" }}>
              {monitor.url}
            </a>
            <span>·</span>
            <span>every {monitor.interval}s</span>
            {lastChecked && <><span>·</span><span>checked at {lastChecked}</span></>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setEditing(true)}>Edit</button>
          <button className="btn-ghost" style={{ fontSize: 12 }} onClick={handlePause}>
            {monitor.active ? "Pause" : "Resume"}
          </button>
          <button className="btn-danger" style={{ fontSize: 12 }} onClick={handleDelete}>Delete</button>
        </div>
      </div>

      {/* ── Metrics row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
        {/* Avg ping */}
        <div className="metric-card" style={{ borderColor: "var(--border)" }}>
          <div className="metric-label">Avg Response</div>
          <div className="metric-value" style={{ color: uptime?.avgPing != null ? "var(--blue)" : "var(--text-muted)", fontSize: 22 }}>
            {uptime?.avgPing != null ? `${uptime.avgPing}ms` : "—"}
          </div>
          {lastPing != null && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>last: {lastPing}ms</div>
          )}
        </div>

        {PERIODS.map((p) => {
          const val = uptime?.uptime[p];
          return (
            <div key={p} className="metric-card">
              <div className="metric-label">{p} uptime</div>
              <div className="metric-value" style={{ color: UptimeColor(val ?? null), fontSize: 22 }}>
                {val != null ? `${val}%` : "—"}
              </div>
              {val != null && (
                <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: "var(--bg4)", overflow: "hidden" }}>
                  <div style={{ width: `${val}%`, height: "100%", borderRadius: 2, background: UptimeColor(val) }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Heartbeat bar ── */}
      <div className="card" style={{ marginBottom: 16, padding: "18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Last {Math.min(60, heartbeats.length)} Checks
          </span>
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-muted)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--green)", display: "inline-block" }} />up
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--red)", display: "inline-block" }} />down
            </span>
          </div>
        </div>
        <HeartbeatBar beats={heartbeats} count={60} />
      </div>

      {/* ── Response time chart ── */}
      <div className="card" style={{ marginBottom: 16, padding: "18px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>
          Response Time (last 60 checks)
        </div>
        <div style={{ height: 150 }}>
          <ResponseTimeChart beats={heartbeats} />
        </div>
      </div>

      {/* ── Incidents ── */}
      {incidents.length > 0 && (
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>
            Incident History
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {incidents.map((inc) => {
              const resolved = !!inc.endTime;
              const duration = inc.endTime
                ? Math.round((new Date(inc.endTime).getTime() - new Date(inc.startTime).getTime()) / 60000)
                : null;
              return (
                <div key={inc.id} style={{
                  padding: "10px 14px",
                  background: "var(--bg3)",
                  borderRadius: 8,
                  borderLeft: `3px solid ${resolved ? "var(--border2)" : "var(--red)"}`,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: resolved ? "var(--text-muted)" : "var(--red)" }}>
                        {resolved ? "Resolved" : "Ongoing"}
                      </span>
                      {duration != null && (
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{duration}m downtime</span>
                      )}
                    </div>
                    {inc.cause && (
                      <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{inc.cause}</div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
                    <div>{new Date(inc.startTime).toLocaleString()}</div>
                    {inc.endTime && <div>{new Date(inc.endTime).toLocaleString()}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
