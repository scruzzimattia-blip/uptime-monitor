import { Router } from "express";
import { z } from "zod";
import { db } from "../db/connection";
import {
  statusPages,
  statusPageMonitors,
  monitors,
  heartbeats,
} from "../db/schema";
import { eq, desc, and, gte, sql, count } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { getMonitorStatus } from "../monitors/engine";

const statusPageSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
  public: z.boolean().default(true),
  monitorIds: z.array(z.number().int()).default([]),
});

// Public status page — no auth, mounted at /api/status/:slug
export const publicStatusRouter = Router();

publicStatusRouter.get("/:slug", async (req, res) => {
  const [page] = await db
    .select()
    .from(statusPages)
    .where(and(eq(statusPages.slug, req.params.slug), eq(statusPages.public, true)))
    .limit(1);

  if (!page) { res.status(404).json({ error: "Status page not found" }); return; }

  const monitorLinks = await db
    .select()
    .from(statusPageMonitors)
    .where(eq(statusPageMonitors.statusPageId, page.id))
    .orderBy(statusPageMonitors.order);

  const monitorData = await Promise.all(
    monitorLinks.map(async ({ monitorId }) => {
      const [m] = await db.select().from(monitors).where(eq(monitors.id, monitorId)).limit(1);
      if (!m) return null;

      const now = new Date();
      const since = new Date(now.getTime() - 90 * 86400 * 1000);

      const beats = await db
        .select()
        .from(heartbeats)
        .where(and(eq(heartbeats.monitorId, monitorId), gte(heartbeats.time, since)))
        .orderBy(desc(heartbeats.time))
        .limit(90);

      const [uptimeRow] = await db
        .select({
          total: count(),
          up: sql<number>`COUNT(*) FILTER (WHERE status = 1)`,
        })
        .from(heartbeats)
        .where(
          and(
            eq(heartbeats.monitorId, monitorId),
            gte(heartbeats.time, new Date(now.getTime() - 30 * 86400 * 1000))
          )
        );

      const total = Number(uptimeRow?.total ?? 0);
      const up = Number(uptimeRow?.up ?? 0);
      const uptime30d = total > 0 ? Math.round((up / total) * 10000) / 100 : null;

      return {
        id: m.id,
        name: m.name,
        currentStatus: getMonitorStatus(m.id),
        beats: beats.map((b) => ({ status: b.status, time: b.time, ping: b.ping })),
        uptime30d,
      };
    })
  );

  res.json({
    page: {
      title: page.title,
      description: page.description,
      logoUrl: page.logoUrl,
    },
    monitors: monitorData.filter(Boolean),
  });
});

// Protected status page management — mounted at /api/status-pages
const router = Router();
router.use(authMiddleware);

router.get("/", async (_req, res) => {
  const pages = await db.select().from(statusPages).orderBy(statusPages.createdAt);
  res.json(pages);
});

router.post("/", async (req, res) => {
  const parsed = statusPageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const { monitorIds, ...pageData } = parsed.data;
  const [created] = await db.insert(statusPages).values(pageData).returning();

  if (monitorIds.length > 0) {
    await db.insert(statusPageMonitors).values(
      monitorIds.map((mid, i) => ({
        statusPageId: created.id,
        monitorId: mid,
        order: i,
      }))
    );
  }

  res.status(201).json(created);
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = statusPageSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const { monitorIds, ...pageData } = parsed.data;

  const [updated] = await db
    .update(statusPages)
    .set(pageData)
    .where(eq(statusPages.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Status page not found" }); return; }

  if (monitorIds !== undefined) {
    await db.delete(statusPageMonitors).where(eq(statusPageMonitors.statusPageId, id));
    if (monitorIds.length > 0) {
      await db.insert(statusPageMonitors).values(
        monitorIds.map((mid, i) => ({ statusPageId: id, monitorId: mid, order: i }))
      );
    }
  }

  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(statusPages).where(eq(statusPages.id, id));
  res.status(204).send();
});

export default router;
