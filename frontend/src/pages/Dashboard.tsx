import { useState } from "react";
import { useMonitors } from "../hooks/useMonitors";
import { useNotifications } from "../hooks/useNotifications";
import Sidebar from "../components/Sidebar";
import MonitorDetail from "./MonitorDetail";
import MonitorModal from "../components/MonitorModal";
import NotificationModal from "../components/NotificationModal";
import { disconnectSocket } from "../lib/socket";

interface Props {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: Props) {
  const { monitors, loading, refetch } = useMonitors();
  const { notifications, refetch: refetchNotifications } = useNotifications();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    disconnectSocket();
    onLogout();
  };

  const selectedMonitor = monitors.find((m) => m.id === selectedId) ?? null;

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {addOpen && (
        <MonitorModal
          onClose={() => setAddOpen(false)}
          onSaved={() => { setAddOpen(false); refetch(); }}
        />
      )}

      {notifOpen && (
        <NotificationModal
          notifications={notifications}
          onClose={() => setNotifOpen(false)}
          onSaved={() => refetchNotifications()}
        />
      )}

      <Sidebar
        monitors={monitors}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onAdd={() => setAddOpen(true)}
        onLogout={handleLogout}
        notificationCount={notifications.length}
        onOpenNotifications={() => setNotifOpen(true)}
      />

      <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : selectedMonitor ? (
          <MonitorDetail
            key={selectedMonitor.id}
            monitor={selectedMonitor}
            onDeleted={() => { setSelectedId(null); refetch(); }}
            onUpdated={refetch}
          />
        ) : (
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 40,
          }}>
            {/* Decorative rings */}
            <div style={{ position: "relative", width: 80, height: 80, marginBottom: 8 }}>
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                background: "linear-gradient(135deg, var(--blue), var(--purple))",
                opacity: 0.15,
                animation: "pulseDot 3s ease-in-out infinite",
              }} />
              <div style={{
                position: "absolute", inset: 10, borderRadius: "50%",
                background: "linear-gradient(135deg, var(--blue), var(--purple))",
                opacity: 0.3,
              }} />
              <div style={{
                position: "absolute", inset: 20, borderRadius: "50%",
                background: "linear-gradient(135deg, var(--blue), var(--purple))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24,
              }}>⬆</div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
                {monitors.length === 0 ? "No monitors yet" : "Select a monitor"}
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: 13, maxWidth: 280 }}>
                {monitors.length === 0
                  ? "Add your first monitor to start tracking uptime, response times, and incidents."
                  : "Choose a monitor from the sidebar to view its details."}
              </div>
            </div>

            {monitors.length === 0 && (
              <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => setAddOpen(true)}>
                + Add your first monitor
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
