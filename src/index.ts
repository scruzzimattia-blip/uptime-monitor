import "./config/env"; // validate env first
import express from "express";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import cors from "cors";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";

import { env } from "./config/env";
import { testConnection } from "./db/connection";
import { runMigrations } from "./db/migrate";
import { db } from "./db/connection";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

import authRouter from "./routes/auth";
import notificationsRouter from "./routes/notifications";
import statusPagesRouter, { publicStatusRouter } from "./routes/statusPages";
import { createMonitorRouter } from "./routes/monitors";
import { setupWebSocket } from "./ws/handler";
import { setSocketServer, startAllMonitors } from "./monitors/engine";
import { startCleanupJob } from "./monitors/cleanup";

async function bootstrap(): Promise<void> {
  await testConnection();
  await runMigrations();

  // Ensure admin user exists on first run
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.username, env.ADMIN_USERNAME))
    .limit(1);

  if (!existing) {
    const hash = await bcrypt.hash(env.ADMIN_PASSWORD, env.BCRYPT_ROUNDS);
    await db.insert(users).values({ username: env.ADMIN_USERNAME, passwordHash: hash });
    console.log(`Admin user created: ${env.ADMIN_USERNAME}`);
  }

  const app = express();
  const httpServer = createServer(app);

  const io = new SocketServer(httpServer, {
    cors: {
      origin: env.NODE_ENV === "development" ? "*" : false,
      methods: ["GET", "POST"],
    },
  });

  app.use(cors({ origin: env.NODE_ENV === "development" ? "*" : false }));
  app.use(express.json({ limit: "1mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API routes
  app.use("/api/auth", authRouter);
  app.use("/api/monitors", createMonitorRouter(io));
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/status-pages", statusPagesRouter);
  app.use("/api/status", publicStatusRouter);

  // Serve frontend if the built dist directory exists
  const frontendDist = path.join(__dirname, "..", "frontend", "dist");
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });
    console.log("Serving frontend from", frontendDist);
  }

  setupWebSocket(io);
  setSocketServer(io);

  await startAllMonitors();
  startCleanupJob();

  httpServer.listen(env.PORT, () => {
    console.log(`Uptime Monitor running on http://0.0.0.0:${env.PORT}`);
  });

  const shutdown = () => {
    console.log("Shutting down...");
    httpServer.close(() => process.exit(0));
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

bootstrap().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
