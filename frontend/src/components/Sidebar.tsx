import { type Monitor } from "../lib/api";
import StatusDot from "./StatusDot";

interface Props {
  monitors: Monitor[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAdd: () => void;
  onLogout: () => void;
}

export default function Sidebar({ monitors, selectedId, onSelect, onAdd, onLogout }: Props) {
  const upCount   = monitors.filter((m) => m.currentStatus === 1).length;
  const downCount = monitors.filter((m) => m.currentStatus === 0).length;

  return (
    <aside style={{
      width: "var(--sidebar-w)",
      background: "var(--bg2)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      height: "100%",
    }}>
      {/* Branding */}
      <div style={{ padding: "18px 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
          <div style={{
            width: 30, height: 30,
            background: "linear-gradient(135deg, var(--blue), var(--purple))",
            borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, flexShrink: 0,
            boxShadow: "0 2px 8px rgba(79,128,255,0.4)",
          }}>⬆</div>
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.2px" }}>Uptime Monitor</span>
        </div>

        {/* Summary pills */}
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{
            background: "var(--green-bg)", color: "var(--green)",
            border: "1px solid rgba(34,211,116,0.2)",
            borderRadius: 20, padding: "2px 9px",
            fontSize: 11, fontWeight: 600,
          }}>↑ {upCount} up</span>
          {downCount > 0 && (
            <span style={{
              background: "var(--red-bg)", color: "var(--red)",
              border: "1px solid rgba(240,69,90,0.2)",
              borderRadius: 20, padding: "2px 9px",
              fontSize: 11, fontWeight: 600,
            }}>↓ {downCount} down</span>
          )}
          {downCount === 0 && monitors.length > 0 && (
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>All systems operational</span>
          )}
        </div>
      </div>

      <div style={{ height: 1, background: "var(--border)", margin: "0 16px" }} />

      {/* Monitor list */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
        {monitors.map((m) => {
          const active = selectedId === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              style={{
                width: "100%",
                padding: "9px 10px",
                background: active ? "var(--bg4)" : "transparent",
                border: "none",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                gap: 9,
                cursor: "pointer",
                textAlign: "left",
                marginBottom: 2,
                outline: active ? "1px solid var(--border2)" : "none",
                transition: "background 0.1s",
              }}
            >
              <StatusDot status={m.currentStatus} size={9} pulse={m.currentStatus === 1} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active ? "var(--text)" : "var(--text)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  lineHeight: 1.3,
                }}>
                  {m.name}
                </div>
                <div style={{
                  fontSize: 11, color: "var(--text-muted)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  marginTop: 1,
                }}>
                  {m.type.toUpperCase()} · every {m.interval}s
                </div>
              </div>
              {!m.active && (
                <span style={{
                  fontSize: 9, color: "var(--text-dim)", fontWeight: 700,
                  letterSpacing: "0.5px", flexShrink: 0,
                }}>PAUSED</span>
              )}
            </button>
          );
        })}

        {monitors.length === 0 && (
          <div style={{ padding: "16px 10px", color: "var(--text-muted)", fontSize: 12, textAlign: "center" }}>
            No monitors yet
          </div>
        )}
      </nav>

      {/* Footer */}
      <div style={{
        padding: "12px 8px",
        borderTop: "1px solid var(--border)",
        display: "flex",
        gap: 6,
      }}>
        <button
          className="btn-primary"
          style={{ flex: 1, fontSize: 13 }}
          onClick={onAdd}
        >
          + Add Monitor
        </button>
        <button className="btn-icon" onClick={onLogout} title="Sign out" style={{ fontSize: 15 }}>
          ⏻
        </button>
      </div>
    </aside>
  );
}
