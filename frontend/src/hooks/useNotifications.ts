import { useState, useEffect } from "react";
import api, { type Notification } from "../lib/api";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/notifications").then((r) => {
      setNotifications(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const refetch = () => api.get("/notifications").then((r) => setNotifications(r.data));

  return { notifications, loading, refetch };
}