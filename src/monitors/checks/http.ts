import axios, { AxiosError } from "axios";
import https from "https";
import type { Monitor, CheckResult } from "../types";

function matchesStatusCode(code: number, pattern: string): boolean {
  if (pattern.includes("-")) {
    const [min, max] = pattern.split("-").map(Number);
    return code >= min && code <= max;
  }
  return code === parseInt(pattern, 10);
}

function isStatusAccepted(code: number, patterns: string[]): boolean {
  return patterns.some((p) => matchesStatusCode(code, p));
}

export async function checkHttp(monitor: Monitor): Promise<CheckResult> {
  const start = Date.now();
  try {
    const response = await axios.request({
      url: monitor.url,
      method: (monitor.method ?? "GET") as "GET",
      timeout: monitor.timeout * 1000,
      maxRedirects: monitor.maxRedirects ?? 10,
      validateStatus: () => true,
      headers: { "User-Agent": "UptimeMonitor/1.0" },
      httpsAgent: monitor.ignoreTls
        ? new https.Agent({ rejectUnauthorized: false })
        : undefined,
    });

    const ping = Date.now() - start;
    const accepted = monitor.acceptedStatusCodes ?? ["200-299"];

    if (!isStatusAccepted(response.status, accepted)) {
      return {
        status: 0,
        ping,
        msg: `Status ${response.status} is not in accepted list`,
      };
    }

    if (monitor.keyword) {
      const body = typeof response.data === "string"
        ? response.data
        : JSON.stringify(response.data);
      if (!body.includes(monitor.keyword)) {
        return {
          status: 0,
          ping,
          msg: `Keyword "${monitor.keyword}" not found in response`,
        };
      }
    }

    return { status: 1, ping, msg: `HTTP ${response.status}` };
  } catch (err) {
    const ping = Date.now() - start;
    const message = err instanceof AxiosError
      ? err.message
      : err instanceof Error
      ? err.message
      : "Unknown error";
    return { status: 0, ping, msg: message };
  }
}
