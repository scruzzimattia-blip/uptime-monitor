import cron from "node-cron";
import { db } from "../db/connection";
import { heartbeats } from "../db/schema";
import { lt } from "drizzle-orm";

export function startCleanupJob(): void {
  // Run daily at 03:00 UTC
  cron.schedule("0 3 * * *", async () => {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    try {
      const result = await db
        .delete(heartbeats)
        .where(lt(heartbeats.time, cutoff))
        .returning({ id: heartbeats.id });
      console.log(`Cleanup: deleted ${result.length} heartbeats older than 90 days`);
    } catch (err) {
      console.error("Cleanup job failed:", err);
    }
  });

  console.log("Cleanup job scheduled (daily at 03:00 UTC)");
}
