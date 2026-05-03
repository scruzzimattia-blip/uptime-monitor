import { db } from "../db/connection";
import { notifications, monitorNotifications } from "../db/schema";
import { eq } from "drizzle-orm";
import type { Monitor, CheckResult } from "../monitors/types";
import { sendTelegram } from "./telegram";
import { sendDiscord } from "./discord";
import { sendEmail } from "./email";
import { sendWebhook } from "./webhook";
export { buildMessage } from "./format";

export async function sendNotifications(monitor: Monitor, result: CheckResult): Promise<void> {
  const channels = await db
    .select({ notification: notifications })
    .from(monitorNotifications)
    .innerJoin(notifications, eq(notifications.id, monitorNotifications.notificationId))
    .where(eq(monitorNotifications.monitorId, monitor.id));

  const activeChannels = channels.filter((c) => c.notification.active);

  for (const { notification } of activeChannels) {
    const config = notification.config as Record<string, unknown>;
    try {
      switch (notification.type) {
        case "telegram":
          await sendTelegram(config, monitor, result);
          break;
        case "discord":
          await sendDiscord(config, monitor, result);
          break;
        case "email":
          await sendEmail(config, monitor, result);
          break;
        case "webhook":
          await sendWebhook(config, monitor, result);
          break;
      }
    } catch (err) {
      console.error(`Failed to send ${notification.type} notification:`, err);
    }
  }
}

