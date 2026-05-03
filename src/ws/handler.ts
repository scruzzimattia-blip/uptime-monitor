import type { Server as SocketServer } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export function setupWebSocket(io: SocketServer): void {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    // Allow unauthenticated connections for public status pages
    if (!token) {
      (socket as { isGuest?: boolean }).isGuest = true;
      return next();
    }

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as { userId: number };
      (socket as { userId?: number }).userId = payload.userId;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const isGuest = (socket as { isGuest?: boolean }).isGuest;
    console.log(`WS client connected: ${socket.id} (${isGuest ? "guest" : "authenticated"})`);

    socket.on("disconnect", () => {
      console.log(`WS client disconnected: ${socket.id}`);
    });

    // Client can subscribe to specific monitors
    socket.on("subscribe", (monitorId: number) => {
      void socket.join(`monitor:${monitorId}`);
    });

    socket.on("unsubscribe", (monitorId: number) => {
      void socket.leave(`monitor:${monitorId}`);
    });
  });
}
