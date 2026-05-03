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
  const data = beats
    .filter((b) => b.ping != null)
    .slice(-60)
    .reverse();

  const labels = data.map((b) =>
    new Date(b.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
  const values = data.map((b) => b.ping!);

  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            data: values,
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59,130,246,0.1)",
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 2,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false } },
        scales: {
          x: {
            ticks: { color: "#7c8db5", maxTicksLimit: 6, font: { size: 11 } },
            grid: { color: "rgba(45,49,71,0.5)" },
          },
          y: {
            ticks: {
              color: "#7c8db5",
              font: { size: 11 },
              callback: (v) => `${v}ms`,
            },
            grid: { color: "rgba(45,49,71,0.5)" },
            min: 0,
          },
        },
      }}
    />
  );
}
