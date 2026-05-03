import { Router } from "express";
import { z } from "zod";
import { db } from "../db/connection";
import { notifications } from "../db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { sendTelegram } from "../notifications/telegram";
import { sendDiscord } from "../notifications/discord";
import { sendEmail } from "../notifications/email";
import { sendWebhook } from "../notifications/webhook";
import { sendNtfy } from "../notifications/ntfy";

const notificationSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(["telegram", "discord", "email", "webhook", "ntfy"]),
  config: z.any(),
  active: z.boolean().default(true),
});

const router = Router();
router.use(authMiddleware);

const testMonitor = {
  id: 0,
  name: "Test Monitor",
  type: "http",
  url: "https://example.com",
  interval: 60,
  timeout: 30,
  retries: 1,
  active: true,
  method: "GET" as const,
  acceptedStatusCodes: ["200-299"],
  keyword: null,
  dnsResolveType: null,
  dnsResolveServer: null,
  maxRedirects: 10,
  ignoreTls: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const testResult = { status: 1 as const, ping: 123, msg: "Test notification" };

router.get("/", async (_req, res) => {
  const all = await db.select().from(notifications).orderBy(notifications.createdAt);
  res.json(all);
});

router.post("/", async (req, res) => {
  const parsed = notificationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const [created] = await db.insert(notifications).values(parsed.data).returning();
  res.status(201).json(created);
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = notificationSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const [updated] = await db
    .update(notifications)
    .set(parsed.data)
    .where(eq(notifications.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Notification not found" }); return; }
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(notifications).where(eq(notifications.id, id));
  res.status(204).send();
});

router.post("/test", async (req, res) => {
  const parsed = notificationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const { type, config } = parsed.data;
  try {
    switch (type) {
      case "telegram":
        await sendTelegram(config as Record<string, unknown>, testMonitor, testResult);
        break;
      case "discord":
        await sendDiscord(config as Record<string, unknown>, testMonitor, testResult);
        break;
      case "email":
        await sendEmail(config as Record<string, unknown>, testMonitor, testResult);
        break;
      case "webhook":
        await sendWebhook(config as Record<string, unknown>, testMonitor, testResult);
        break;
      case "ntfy":
        await sendNtfy(config as Record<string, unknown>, testMonitor, testResult);
        break;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Test failed" });
  }
});

export default router;
