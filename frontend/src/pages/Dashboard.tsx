import { useState } from "react";
import { useMonitors } from "../hooks/useMonitors";
import Sidebar from "../components/Sidebar";
import MonitorDetail from "./MonitorDetail";
import MonitorModal from "../components/MonitorModal";
import { disconnectSocket } from "../lib/socket";

interface Props {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: Props) {
  const { monitors, loading, refetch } = useMonitors();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

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

      <Sidebar
        monitors={monitors}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onAdd={() => setAddOpen(true)}
        onLogout={handleLogout}
      />

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="spinner" />
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
            color: "var(--text-muted)",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⬆</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No monitor selected</div>
            <div style={{ marginBottom: 24 }}>
              {monitors.length === 0
                ? "Add your first monitor to get started"
                : "Select a monitor from the sidebar"}
            </div>
            {monitors.length === 0 && (
              <button className="btn-primary" onClick={() => setAddOpen(true)}>
                + Add Monitor
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
