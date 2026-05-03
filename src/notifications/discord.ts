import axios from "axios";
import type { Monitor, CheckResult } from "../monitors/types";

interface DiscordConfig {
  webhookUrl: string;
}

export async function sendDiscord(
  config: Record<string, unknown>,
  monitor: Monitor,
  result: CheckResult
): Promise<void> {
  const { webhookUrl } = config as DiscordConfig;
  if (!webhookUrl) throw new Error("Missing Discord webhookUrl");

  const color = result.status === 1 ? 0x2ecc71 : 0xe74c3c;
  const statusText = result.status === 1 ? "✅ UP" : "❌ DOWN";

  await axios.post(webhookUrl, {
    embeds: [
      {
        title: `${statusText} — ${monitor.name}`,
        color,
        fields: [
          { name: "URL", value: monitor.url, inline: false },
          { name: "Status", value: result.status === 1 ? "UP" : "DOWN", inline: true },
          result.ping != null
            ? { name: "Response Time", value: `${result.ping}ms`, inline: true }
            : null,
          result.msg
            ? { name: "Message", value: result.msg.slice(0, 1024), inline: false }
            : null,
        ].filter(Boolean),
        timestamp: new Date().toISOString(),
      },
    ],
  });
}
