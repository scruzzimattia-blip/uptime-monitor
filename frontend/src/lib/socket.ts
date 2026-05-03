import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io("/", {
      auth: { token: localStorage.getItem("token") },
      transports: ["websocket"],
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export interface HeartbeatEvent {
  monitorId: number;
  status: 0 | 1;
  ping: number | null;
  msg: string;
  time: string;
}

export interface StatusChangeEvent {
  monitorId: number;
  oldStatus: 0 | 1;
  newStatus: 0 | 1;
}
