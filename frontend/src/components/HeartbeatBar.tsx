import { useState } from "react";
import { type Heartbeat } from "../lib/api";

interface Props {
  beats: Heartbeat[];
  count?: number;
}

interface TooltipState {
  beat: Heartbeat;
  x: number;
  y: number;
}

export default function HeartbeatBar({ beats, count = 60 }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const displayed = [...beats].reverse().slice(0, count).reverse();
  const placeholders = count - displayed.length;

  const getColor = (status: number) =>
    status === 1 ? "var(--green)" : "var(--red)";

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 2, alignItems: "stretch", height: 28 }}>
        {Array.from({ length: placeholders }).map((_, i) => (
          <div key={`ph-${i}`} style={{
            flex: 1, borderRadius: 3,
            background: "var(--bg3)",
          }} />
        ))}
        {displayed.map((beat, i) => (
          <div
            key={beat.id || i}
            style={{
              flex: 1,
              borderRadius: 3,
              background: getColor(beat.status),
              opacity: 0.75,
              cursor: "default",
              transition: "opacity 0.1s, transform 0.1s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "1";
              (e.currentTarget as HTMLElement).style.transform = "scaleY(1.1)";
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltip({ beat, x: rect.left + rect.width / 2, y: rect.top });
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "0.75";
              (e.currentTarget as HTMLElement).style.transform = "";
              setTooltip(null);
            }}
          />
        ))}
      </div>

      {tooltip && (
        <div style={{
          position: "fixed",
          left: tooltip.x,
          top: tooltip.y - 8,
          transform: "translate(-50%, -100%)",
          background: "var(--bg4)",
          border: "1px solid var(--border2)",
          borderRadius: 6,
          padding: "6px 10px",
          fontSize: 11,
          color: "var(--text)",
          pointerEvents: "none",
          zIndex: 200,
          whiteSpace: "nowrap",
          boxShadow: "var(--shadow)",
        }}>
          <div style={{ fontWeight: 600, color: tooltip.beat.status === 1 ? "var(--green)" : "var(--red)", marginBottom: 2 }}>
            {tooltip.beat.status === 1 ? "UP" : "DOWN"}
            {tooltip.beat.ping != null && ` · ${tooltip.beat.ping}ms`}
          </div>
          <div style={{ color: "var(--text-muted)" }}>
            {new Date(tooltip.beat.time).toLocaleString()}
          </div>
          {tooltip.beat.msg && (
            <div style={{ color: "var(--text-muted)", marginTop: 2, maxWidth: 200 }}>
              {tooltip.beat.msg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
