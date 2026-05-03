import { useState, useEffect, useCallback } from "react";
import api, { type Monitor } from "../lib/api";
import { getSocket, type HeartbeatEvent, type StatusChangeEvent } from "../lib/socket";

export function useMonitors() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMonitors = useCallback(async () => {
    const { data } = await api.get<Monitor[]>("/monitors");
    setMonitors(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMonitors();

    const socket = getSocket();

    socket.on("heartbeat", (ev: HeartbeatEvent) => {
      setMonitors((prev) =>
        prev.map((m) =>
          m.id === ev.monitorId
            ? {
                ...m,
                currentStatus: ev.status,
                lastHeartbeat: {
                  id: 0,
                  monitorId: ev.monitorId,
                  status: ev.status,
                  ping: ev.ping,
                  msg: ev.msg,
                  time: ev.time,
                },
              }
            : m
        )
      );
    });

    socket.on("monitor_status_change", (ev: StatusChangeEvent) => {
      setMonitors((prev) =>
        prev.map((m) =>
          m.id === ev.monitorId ? { ...m, currentStatus: ev.newStatus } : m
        )
      );
    });

    socket.on("monitor_created", (m: Monitor) => {
      setMonitors((prev) => [...prev, m]);
    });

    socket.on("monitor_deleted", ({ id }: { id: number }) => {
      setMonitors((prev) => prev.filter((m) => m.id !== id));
    });

    return () => {
      socket.off("heartbeat");
      socket.off("monitor_status_change");
      socket.off("monitor_created");
      socket.off("monitor_deleted");
    };
  }, [fetchMonitors]);

  return { monitors, loading, refetch: fetchMonitors };
}
