import { db } from "../db/connection";
import { monitors, heartbeats, incidents } from "../db/schema";
import { eq, desc, and, gte, isNull } from "drizzle-orm";
import { checkHttp } from "./checks/http";
import { checkTcp } from "./checks/tcp";
import { checkPing } from "./checks/ping";
import { checkDns } from "./checks/dns";
import type { Monitor, CheckResult } from "./types";
import { sendNotifications } from "../notifications/dispatcher";
import type { Server as SocketServer } from "socket.io";

// monitorId → status (1 = up, 0 = down, null = unknown)
const currentStatus = new Map<number, 0 | 1 | null>();
// monitorId → NodeJS.Timeout
const timers = new Map<number, ReturnType<typeof setTimeout>>();

let io: SocketServer | null = null;

export function setSocketServer(server: SocketServer): void {
  io = server;
}

async function runCheck(monitor: Monitor): Promise<void> {
  let result: CheckResult;

  try {
    switch (monitor.type) {
      case "http":
      case "https":
        result = await checkHttp(monitor);
        break;
      case "tcp":
        result = await checkTcp(monitor);
        break;
      case "ping":
      case "icmp":
        result = await checkPing(monitor);
        break;
      case "dns":
        result = await checkDns(monitor);
        break;
      default:
        result = { status: 0, ping: null, msg: `Unknown monitor type: ${monitor.type}` };
    }
  } catch (err) {
    result = {
      status: 0,
      ping: null,
      msg: err instanceof Error ? err.message : "Unexpected check error",
    };
  }

  const now = new Date();

  // Insert heartbeat
  await db.insert(heartbeats).values({
    monitorId: monitor.id,
    status: result.status,
    ping: result.ping,
    msg: result.msg,
    time: now,
  });

  // Emit heartbeat event
  io?.emit("heartbeat", {
    monitorId: monitor.id,
    status: result.status,
    ping: result.ping,
    msg: result.msg,
    time: now.toISOString(),
  });

  const previous = currentStatus.get(monitor.id);

  // Status change detection
  if (previous !== null && previous !== undefined && previous !== result.status) {
    io?.emit("monitor_status_change", {
      monitorId: monitor.id,
      oldStatus: previous,
      newStatus: result.status,
    });

    if (result.status === 0) {
      // Opened incident
      await db.insert(incidents).values({
        monitorId: monitor.id,
        startTime: now,
        cause: result.msg,
      });
    } else {
      // Close open incident
      await db
        .update(incidents)
        .set({ endTime: now })
        .where(and(eq(incidents.monitorId, monitor.id), isNull(incidents.endTime)));
    }

    // Send notifications
    await sendNotifications(monitor, result).catch((err) =>
      console.error(`Notification error for monitor ${monitor.id}:`, err)
    );
  }

  currentStatus.set(monitor.id, result.status);
}

function scheduleMonitor(monitor: Monitor): void {
  if (timers.has(monitor.id)) {
    clearTimeout(timers.get(monitor.id)!);
  }

  const tick = async () => {
    if (!monitor.active) return;

    const [fresh] = await db
      .select()
      .from(monitors)
      .where(eq(monitors.id, monitor.id))
      .limit(1);

    if (!fresh || !fresh.active) {
      timers.delete(monitor.id);
      return;
    }

    await runCheck(fresh).catch((err) =>
      console.error(`Check failed for monitor ${monitor.id}:`, err)
    );

    // Reschedule
    const t = setTimeout(tick, fresh.interval * 1000);
    timers.set(monitor.id, t);
  };

  // Stagger initial checks to avoid thundering herd
  const jitter = Math.floor(Math.random() * Math.min(monitor.interval * 1000, 10000));
  const t = setTimeout(tick, jitter);
  timers.set(monitor.id, t);
}

export async function startMonitor(monitorId: number): Promise<void> {
  const [monitor] = await db
    .select()
    .from(monitors)
    .where(eq(monitors.id, monitorId))
    .limit(1);

  if (monitor && monitor.active) {
    scheduleMonitor(monitor);
  }
}

export function stopMonitor(monitorId: number): void {
  const t = timers.get(monitorId);
  if (t) {
    clearTimeout(t);
    timers.delete(monitorId);
  }
  currentStatus.delete(monitorId);
}

export async function startAllMonitors(): Promise<void> {
  const allMonitors = await db
    .select()
    .from(monitors)
    .where(eq(monitors.active, true));

  console.log(`Starting ${allMonitors.length} monitors`);
  for (const monitor of allMonitors) {
    scheduleMonitor(monitor);
  }
}

export function stopAllMonitors(): void {
  for (const [id, t] of timers.entries()) {
    clearTimeout(t);
    timers.delete(id);
  }
  currentStatus.clear();
}

export function getMonitorStatus(monitorId: number): 0 | 1 | null {
  return currentStatus.get(monitorId) ?? null;
}

export function getAllStatuses(): Record<number, 0 | 1 | null> {
  const result: Record<number, 0 | 1 | null> = {};
  for (const [id, status] of currentStatus.entries()) {
    result[id] = status;
  }
  return result;
}
