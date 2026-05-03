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
  const upCount = monitors.filter((m) => m.currentStatus === 1).length;
  const downCount = monitors.filter((m) => m.currentStatus === 0).length;

  return (
    <div style={{
      width: "var(--sidebar-w)",
      background: "var(--bg2)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      height: "100%",
    }}>
      {/* Header */}
      <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{
            width: 28,
            height: 28,
            background: "var(--blue)",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}>⬆</div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Uptime Monitor</span>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--green)" }}>↑ {upCount} up</span>
          {downCount > 0 && (
            <span style={{ fontSize: 12, color: "var(--red)" }}>↓ {downCount} down</span>
          )}
        </div>
      </div>

      {/* Monitor list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {monitors.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            style={{
              width: "100%",
              padding: "10px 16px",
              background: selectedId === m.id ? "var(--bg3)" : "transparent",
              border: "none",
              borderLeft: selectedId === m.id ? "3px solid var(--blue)" : "3px solid transparent",
              borderRadius: 0,
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <StatusDot status={m.currentStatus} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {m.name}
              </div>
              <div style={{
                fontSize: 11,
                color: "var(--text-muted)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {m.url}
              </div>
            </div>
            {!m.active && (
              <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>PAUSED</span>
            )}
          </button>
        ))}

        {monitors.length === 0 && (
          <div style={{ padding: "20px 16px", color: "var(--text-muted)", fontSize: 13 }}>
            No monitors yet
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={onAdd}>
          + Add Monitor
        </button>
        <button className="btn-ghost" style={{ padding: "8px 10px" }} onClick={onLogout} title="Logout">
          ⏻
        </button>
      </div>
    </div>
  );
}
