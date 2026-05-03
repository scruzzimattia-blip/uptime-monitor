import axios from "axios";
import type { Monitor, CheckResult } from "../monitors/types";

interface WebhookConfig {
  url: string;
  method?: "GET" | "POST" | "PUT";
  headers?: Record<string, string>;
  bodyTemplate?: string;
}

export async function sendWebhook(
  config: Record<string, unknown>,
  monitor: Monitor,
  result: CheckResult
): Promise<void> {
  const { url, method = "POST", headers = {}, bodyTemplate } = config as WebhookConfig;
  if (!url) throw new Error("Missing webhook url");

  const defaultPayload = {
    monitorId: monitor.id,
    monitorName: monitor.name,
    monitorUrl: monitor.url,
    status: result.status === 1 ? "UP" : "DOWN",
    ping: result.ping,
    msg: result.msg,
    time: new Date().toISOString(),
  };

  let body: unknown = defaultPayload;
  if (bodyTemplate) {
    try {
      const rendered = bodyTemplate
        .replace(/\{\{monitorName\}\}/g, monitor.name)
        .replace(/\{\{monitorUrl\}\}/g, monitor.url)
        .replace(/\{\{status\}\}/g, result.status === 1 ? "UP" : "DOWN")
        .replace(/\{\{ping\}\}/g, String(result.ping ?? ""))
        .replace(/\{\{msg\}\}/g, result.msg ?? "")
        .replace(/\{\{time\}\}/g, new Date().toISOString());
      body = JSON.parse(rendered);
    } catch {
      body = bodyTemplate;
    }
  }

  await axios.request({ url, method, headers, data: body });
}
