import { Router } from "express";
import { z } from "zod";
import { db } from "../db/connection";
import { monitors, heartbeats, incidents } from "../db/schema";
import { eq, desc, and, gte, sql, count } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { startMonitor, stopMonitor, getMonitorStatus } from "../monitors/engine";
import type { Server as SocketServer } from "socket.io";

const monitorSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(["http", "https", "tcp", "ping", "icmp", "dns"]),
  url: z.string().min(1),
  interval: z.number().int().min(20).max(86400).default(60),
  timeout: z.number().int().min(1).max(60).default(30),
  retries: z.number().int().min(0).max(10).default(1),
  active: z.boolean().default(true),
  method: z.enum(["GET", "POST", "PUT", "HEAD", "OPTIONS"]).default("GET"),
  acceptedStatusCodes: z.array(z.string()).default(["200-299"]),
  keyword: z.string().optional(),
  dnsResolveType: z.string().optional(),
  dnsResolveServer: z.string().optional(),
  maxRedirects: z.number().int().min(0).max(20).default(10),
  ignoreTls: z.boolean().default(false),
});

export function createMonitorRouter(io: SocketServer): Router {
  const router = Router();
  router.use(authMiddleware);

  // GET /api/monitors
  router.get("/", async (_req, res) => {
    const all = await db.select().from(monitors).orderBy(monitors.createdAt);
    const statuses = await Promise.all(
      all.map(async (m) => {
        const status = getMonitorStatus(m.id);
        const [last] = await db
          .select()
          .from(heartbeats)
          .where(eq(heartbeats.monitorId, m.id))
          .orderBy(desc(heartbeats.time))
          .limit(1);
        return { ...m, currentStatus: status, lastHeartbeat: last ?? null };
      })
    );
    res.json(statuses);
  });

  // POST /api/monitors
  router.post("/", async (req, res) => {
    const parsed = monitorSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }

    const [created] = await db.insert(monitors).values(parsed.data).returning();
    await startMonitor(created.id);
    io.emit("monitor_created", created);
    res.status(201).json(created);
  });

  // PUT /api/monitors/:id
  router.put("/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const parsed = monitorSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }

    const [updated] = await db
      .update(monitors)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(monitors.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "Monitor not found" }); return; }

    // Restart with new config
    stopMonitor(id);
    if (updated.active) await startMonitor(id);

    res.json(updated);
  });

  // DELETE /api/monitors/:id
  router.delete("/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    stopMonitor(id);
    await db.delete(monitors).where(eq(monitors.id, id));
    io.emit("monitor_deleted", { id });
    res.status(204).send();
  });

  // GET /api/monitors/:id/heartbeats
  router.get("/:id/heartbeats", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit ?? "100"), 10)));
    const offset = (page - 1) * limit;

    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(heartbeats)
        .where(eq(heartbeats.monitorId, id))
        .orderBy(desc(heartbeats.time))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(heartbeats)
        .where(eq(heartbeats.monitorId, id)),
    ]);

    res.json({ data: rows, total: Number(total), page, limit });
  });

  // GET /api/monitors/:id/uptime
  router.get("/:id/uptime", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const now = new Date();
    const periods: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };
    const result: Record<string, number | null> = {};

    for (const [key, days] of Object.entries(periods)) {
      const since = new Date(now.getTime() - days * 86400 * 1000);
      const [row] = await db
        .select({
          total: count(),
          up: sql<number>`COUNT(*) FILTER (WHERE status = 1)`,
        })
        .from(heartbeats)
        .where(and(eq(heartbeats.monitorId, id), gte(heartbeats.time, since)));

      const total = Number(row?.total ?? 0);
      const up = Number(row?.up ?? 0);
      result[key] = total > 0 ? Math.round((up / total) * 10000) / 100 : null;
    }

    // Average ping last 24h
    const since24h = new Date(now.getTime() - 86400 * 1000);
    const [pingRow] = await db
      .select({ avg: sql<number>`AVG(ping)` })
      .from(heartbeats)
      .where(and(eq(heartbeats.monitorId, id), gte(heartbeats.time, since24h)));

    res.json({ uptime: result, avgPing: pingRow?.avg ? Math.round(Number(pingRow.avg)) : null });
  });

  // POST /api/monitors/:id/pause
  router.post("/:id/pause", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [monitor] = await db.select().from(monitors).where(eq(monitors.id, id)).limit(1);
    if (!monitor) { res.status(404).json({ error: "Monitor not found" }); return; }

    const newActive = !monitor.active;
    const [updated] = await db
      .update(monitors)
      .set({ active: newActive, updatedAt: new Date() })
      .where(eq(monitors.id, id))
      .returning();

    if (newActive) {
      await startMonitor(id);
    } else {
      stopMonitor(id);
    }

    res.json(updated);
  });

  // GET /api/monitors/:id/incidents
  router.get("/:id/incidents", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const rows = await db
      .select()
      .from(incidents)
      .where(eq(incidents.monitorId, id))
      .orderBy(desc(incidents.startTime))
      .limit(50);

    res.json(rows);
  });

  return router;
}
