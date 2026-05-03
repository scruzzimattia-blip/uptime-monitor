import * as net from "net";
import type { Monitor, CheckResult } from "../types";

export async function checkTcp(monitor: Monitor): Promise<CheckResult> {
  const start = Date.now();
  return new Promise((resolve) => {
    const [host, portStr] = monitor.url.replace(/^tcp:\/\//i, "").split(":");
    const port = parseInt(portStr, 10);

    if (!host || isNaN(port)) {
      resolve({ status: 0, ping: null, msg: "Invalid TCP address (use host:port)" });
      return;
    }

    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ status: 0, ping: Date.now() - start, msg: "Connection timed out" });
    }, monitor.timeout * 1000);

    socket.connect(port, host, () => {
      clearTimeout(timer);
      const ping = Date.now() - start;
      socket.destroy();
      resolve({ status: 1, ping, msg: `TCP connection to ${host}:${port} succeeded` });
    });

    socket.on("error", (err) => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ status: 0, ping: Date.now() - start, msg: err.message });
    });
  });
}
