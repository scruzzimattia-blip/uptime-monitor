import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { Heartbeat } from "../lib/api";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

interface Props {
  beats: Heartbeat[];
}

export default function ResponseTimeChart({ beats }: Props) {
  const data = [...beats]
    .filter((b) => b.ping != null && b.status === 1)
    .slice(-60)
    .reverse();

  if (data.length === 0) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12 }}>
        No response time data
      </div>
    );
  }

  const labels = data.map((b) =>
    new Date(b.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
  const values = data.map((b) => b.ping!);
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            data: values,
            borderColor: "#4f80ff",
            backgroundColor: (ctx) => {
              const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
              gradient.addColorStop(0, "rgba(79,128,255,0.18)");
              gradient.addColorStop(1, "rgba(79,128,255,0)");
              return gradient;
            },
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: "#4f80ff",
            borderWidth: 1.5,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(24,28,46,0.95)",
            borderColor: "rgba(46,52,80,1)",
            borderWidth: 1,
            titleColor: "#6b7599",
            bodyColor: "#e8ecf4",
            padding: 10,
            callbacks: {
              title: (items) => items[0]?.label ?? "",
              label: (item) => ` ${item.raw}ms`,
              afterBody: () => [`avg ${avg}ms`],
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "#6b7599", maxTicksLimit: 8, font: { size: 10 } },
            grid: { color: "rgba(37,42,64,0.6)" },
            border: { display: false },
          },
          y: {
            ticks: {
              color: "#6b7599",
              font: { size: 10 },
              callback: (v) => `${v}ms`,
              maxTicksLimit: 5,
            },
            grid: { color: "rgba(37,42,64,0.6)" },
            border: { display: false },
            min: 0,
          },
        },
      }}
    />
  );
}
