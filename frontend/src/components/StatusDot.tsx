interface Props {
  status: 0 | 1 | null;
  size?: number;
}

export default function StatusDot({ status, size = 10 }: Props) {
  const color =
    status === 1 ? "var(--green)" : status === 0 ? "var(--red)" : "var(--text-muted)";
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
        boxShadow: status === 1
          ? `0 0 6px var(--green)`
          : status === 0
          ? `0 0 6px var(--red)`
          : "none",
      }}
    />
  );
}
