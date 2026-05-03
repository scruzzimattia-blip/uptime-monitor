import { type Heartbeat } from "../lib/api";

interface Props {
  beats: Heartbeat[];
  count?: number;
}

export default function HeartbeatBar({ beats, count = 60 }: Props) {
  // Take most recent `count` heartbeats, oldest→newest left→right
  const displayed = beats.slice(-count);
  const placeholders = count - displayed.length;

  const getColor = (status: number) => {
    if (status === 1) return "var(--green)";
    if (status === 0) return "var(--red)";
    return "var(--text-muted)";
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 2,
        alignItems: "flex-end",
        height: 32,
      }}
    >
      {Array.from({ length: placeholders }).map((_, i) => (
        <div
          key={`ph-${i}`}
          style={{
            flex: 1,
            height: "100%",
            background: "var(--bg3)",
            borderRadius: 2,
          }}
        />
      ))}
      {displayed.map((beat, i) => (
        <div
          key={beat.id || i}
          title={`${new Date(beat.time).toLocaleString()} — ${beat.status === 1 ? "UP" : "DOWN"}${beat.ping != null ? ` (${beat.ping}ms)` : ""}`}
          style={{
            flex: 1,
            height: "100%",
            background: getColor(beat.status),
            borderRadius: 2,
            opacity: 0.85,
            transition: "opacity 0.1s",
            cursor: "default",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.85")}
        />
      ))}
    </div>
  );
}
