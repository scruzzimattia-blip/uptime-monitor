import type { Monitor, CheckResult } from "../monitors/types";

export function buildMessage(monitor: Monitor, result: CheckResult): string {
  const statusText = result.status === 1 ? "✅ UP" : "❌ DOWN";
  const lines = [
    `[${statusText}] ${monitor.name}`,
    `URL: ${monitor.url}`,
    `Status: ${result.status === 1 ? "UP" : "DOWN"}`,
    result.ping != null ? `Response time: ${result.ping}ms` : null,
    result.msg ? `Message: ${result.msg}` : null,
    `Time: ${new Date().toISOString()}`,
  ];
  return lines.filter(Boolean).join("\n");
}
