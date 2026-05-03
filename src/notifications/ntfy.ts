import axios from "axios";
import type { Monitor, CheckResult } from "../monitors/types";

interface NtfyConfig {
  server: string;
  topic: string;
  username?: string;
  password?: string;
}

export async function sendNtfy(
  config: Record<string, unknown>,
  monitor: Monitor,
  result: CheckResult
): Promise<void> {
  const { server, topic, username, password } = config as unknown as NtfyConfig;
  if (!server || !topic) throw new Error("Missing ntfy server or topic");

  const title = result.status === 1 ? "✅ Monitor UP" : "❌ Monitor DOWN";
  const message = `${monitor.name} (${monitor.url}) is ${result.status === 1 ? "UP" : "DOWN"}\n${result.msg || ""}`;

  const headers: Record<string, string> = {
    "Title": title,
    "Priority": result.status === 1 ? "low" : "high",
    "Tags": result.status === 1 ? "green_check,bell" : "warning,bell",
  };

  if (username && password) {
    const auth = Buffer.from(`${username}:${password}`).toString("base64");
    headers["Authorization"] = `Basic ${auth}`;
  }

  const url = server.endsWith("/") ? `${server}${topic}` : `${server}/${topic}`;
  await axios.post(url, message, { headers });
}