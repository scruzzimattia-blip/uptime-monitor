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

export default function MonitorDetail({ monitor, onDeleted, onUpdated }: Props) {
  const [heartbeats, setHeartbeats] = useState<Heartbeat[]>([]);
  const [uptime, setUptime] = useState<UptimeStats | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

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
    if (!confirm(`Delete monitor "${monitor.name}"?`)) return;
    await api.delete(`/monitors/${monitor.id}`);
    onDeleted();
  };

  const statusLabel = monitor.currentStatus === 1 ? "UP" : monitor.currentStatus === 0 ? "DOWN" : "PENDING";
  const statusClass = monitor.currentStatus === 1 ? "badge-up" : monitor.currentStatus === 0 ? "badge-down" : "badge-pending";

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>
      {editing && (
        <MonitorModal
          monitor={monitor}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); onUpdated(); }}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
        <StatusDot status={monitor.currentStatus} size={14} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>{monitor.name}</h1>
            <span className={statusClass}>{statusLabel}</span>
            {!monitor.active && (
              <span className="badge-pending">PAUSED</span>
            )}
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            {monitor.type.toUpperCase()} · {monitor.url} · every {monitor.interval}s
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-ghost" onClick={() => setEditing(true)}>Edit</button>
          <button className="btn-ghost" onClick={handlePause}>
            {monitor.active ? "Pause" : "Resume"}
          </button>
          <button className="btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      {/* Uptime stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {(["24h", "7d", "30d", "90d"] as const).map((period) => (
          <div key={period} className="card" style={{ padding: 16 }}>
            <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 4 }}>{period} uptime</div>
            <div style={{
              fontSize: 24,
              fontWeight: 700,
              color: uptime?.uptime[period] != null
                ? uptime.uptime[period]! >= 99 ? "var(--green)" : uptime.uptime[period]! >= 90 ? "var(--yellow)" : "var(--red)"
                : "var(--text-muted)",
            }}>
              {uptime?.uptime[period] != null ? `${uptime.uptime[period]}%` : "—"}
            </div>
          </div>
        ))}
      </div>

      {/* Avg ping */}
      <div className="card" style={{ marginBottom: 24, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Avg Response Time (24h)</span>
          <span style={{ fontWeight: 600, fontSize: 18 }}>
            {uptime?.avgPing != null ? `${uptime.avgPing}ms` : "—"}
          </span>
        </div>
        {monitor.lastHeartbeat && (
          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
            Last check: {new Date(monitor.lastHeartbeat.time).toLocaleString()}
            {monitor.lastHeartbeat.ping != null && ` · ${monitor.lastHeartbeat.ping}ms`}
            {monitor.lastHeartbeat.msg && ` · ${monitor.lastHeartbeat.msg}`}
          </div>
        )}
      </div>

      {/* Heartbeat bar */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Last 60 Checks</div>
        <HeartbeatBar beats={heartbeats} count={60} />
      </div>

      {/* Response time chart */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Response Time (last 60 checks)</div>
        <div style={{ height: 160 }}>
          <ResponseTimeChart beats={heartbeats} />
        </div>
      </div>

      {/* Incidents */}
      {incidents.length > 0 && (
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Incident History</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {incidents.map((inc) => (
              <div
                key={inc.id}
                style={{
                  padding: "10px 12px",
                  background: "var(--bg3)",
                  borderRadius: 6,
                  borderLeft: `3px solid ${inc.endTime ? "var(--text-muted)" : "var(--red)"}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ fontWeight: 500 }}>
                    {inc.endTime ? "Resolved" : "Ongoing"} incident
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>
                    {inc.endTime
                      ? `${Math.round((new Date(inc.endTime).getTime() - new Date(inc.startTime).getTime()) / 60000)}m`
                      : "Ongoing"}
                  </span>
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>
                  {new Date(inc.startTime).toLocaleString()}
                  {inc.endTime && ` → ${new Date(inc.endTime).toLocaleString()}`}
                </div>
                {inc.cause && (
                  <div style={{ color: "var(--red)", fontSize: 12, marginTop: 2 }}>{inc.cause}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
