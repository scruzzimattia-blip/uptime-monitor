interface Props {
  status: 0 | 1 | null;
  size?: number;
  pulse?: boolean;
}

export default function StatusDot({ status, size = 10, pulse = false }: Props) {
  const color =
    status === 1 ? "var(--green)" :
    status === 0 ? "var(--red)" :
    "var(--text-dim)";

  const glowColor =
    status === 1 ? "var(--green-glow)" :
    status === 0 ? "var(--red-glow)" :
    "transparent";

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: size, height: size }}>
      {pulse && status === 1 && (
        <span style={{
          position: "absolute",
          inset: -3,
          borderRadius: "50%",
          background: glowColor,
          animation: "pulseDot 2s ease-in-out infinite",
        }} />
      )}
      <span style={{
        display: "block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        boxShadow: status !== null ? `0 0 ${size}px ${glowColor}` : "none",
        flexShrink: 0,
      }} />
      <style>{`
        @keyframes pulseDot {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.5); }
        }
      `}</style>
    </span>
  );
}
