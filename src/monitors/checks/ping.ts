import { exec } from "child_process";
import type { Monitor, CheckResult } from "../types";

export async function checkPing(monitor: Monitor): Promise<CheckResult> {
  const host = monitor.url.replace(/^icmp:\/\//i, "").replace(/^ping:\/\//i, "");
  const start = Date.now();

  return new Promise((resolve) => {
    // Use system ping — works cross-platform in Docker
    const cmd = process.platform === "win32"
      ? `ping -n 1 -w ${monitor.timeout * 1000} ${host}`
      : `ping -c 1 -W ${monitor.timeout} ${host}`;

    exec(cmd, { timeout: (monitor.timeout + 2) * 1000 }, (error, stdout) => {
      const ping = Date.now() - start;
      if (error) {
        resolve({ status: 0, ping, msg: `Ping failed: ${error.message}` });
        return;
      }

      // Parse average RTT from output
      const match = stdout.match(/time[=<](\d+(?:\.\d+)?)/i) ||
                    stdout.match(/Average = (\d+)ms/i);
      const rtt = match ? Math.round(parseFloat(match[1])) : ping;
      resolve({ status: 1, ping: rtt, msg: `Ping to ${host} succeeded` });
    });
  });
}
