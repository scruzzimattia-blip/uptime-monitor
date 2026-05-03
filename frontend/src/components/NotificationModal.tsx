import React, { useState } from "react";
import api, { type Notification } from "../lib/api";

interface Props {
  notifications: Notification[];
  onClose: () => void;
  onSaved: () => void;
}

const TYPE_OPTIONS = [
  { value: "telegram", label: "Telegram", icon: "✈️" },
  { value: "discord", label: "Discord", icon: "💬" },
  { value: "email", label: "Email", icon: "📧" },
  { value: "webhook", label: "Webhook", icon: "🔗" },
  { value: "ntfy", label: "Ntfy", icon: "🔔" },
];

const FIELDS: Record<string, { key: string; label: string; placeholder: string; optional?: boolean }[]> = {
  telegram: [
    { key: "botToken", label: "Bot Token", placeholder: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" },
    { key: "chatId", label: "Chat ID", placeholder: "123456789" },
  ],
  discord: [
    { key: "webhookUrl", label: "Webhook URL", placeholder: "https://discord.com/api/webhooks/..." },
  ],
  email: [
    { key: "host", label: "SMTP Host", placeholder: "smtp.example.com" },
    { key: "port", label: "Port", placeholder: "587" },
    { key: "username", label: "Username", placeholder: "user@example.com" },
    { key: "password", label: "Password", placeholder: "password" },
    { key: "to", label: "To", placeholder: "alert@example.com" },
  ],
  webhook: [
    { key: "url", label: "URL", placeholder: "https://..." },
    { key: "method", label: "Method", placeholder: "POST", optional: true },
  ],
  ntfy: [
    { key: "server", label: "Server", placeholder: "https://ntfy.sh" },
    { key: "topic", label: "Topic", placeholder: "my-topic" },
    { key: "username", label: "Username", placeholder: "username", optional: true },
    { key: "password", label: "Password", placeholder: "password", optional: true },
  ],
};

export default function NotificationModal({ notifications, onClose, onSaved }: Props) {
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", type: "telegram" as string, config: {} as Record<string, string>, active: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; error?: string } | null>(null);

  const currentFields = FIELDS[form.type] || [];

  const resetForm = () => {
    setForm({ name: "", type: "telegram", config: {}, active: true });
    setEditId(null);
    setError("");
    setTestResult(null);
  };

  const loadNotification = (n: Notification) => {
    setForm({
      name: n.name,
      type: n.type,
      config: (n.config || {}) as Record<string, string>,
      active: n.active,
    });
    setEditId(n.id);
    setTestResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = { ...form, config: form.config };
      if (editId) {
        await api.put(`/notifications/${editId}`, payload);
      } else {
        await api.post("/notifications", payload);
      }
      onSaved();
      resetForm();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { error?: string; details?: unknown } } })?.response?.data;
      const msg = data?.error ?? "Failed to save";
      const details = data?.details;
      setError(details ? `${msg}: ${JSON.stringify(details)}` : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await api.post("/notifications/test", { type: form.type, config: form.config });
      setTestResult({ success: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setTestResult({ error: msg ?? "Test failed" });
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this notification?")) return;
    try {
      await api.delete(`/notifications/${id}`);
      onSaved();
      if (editId === id) resetForm();
    } catch (err) {
      alert("Failed to delete");
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-title">🔔 Notifications</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          {notifications.map((n) => (
            <div key={n.id} style={{
              padding: 12, background: "var(--bg3)", borderRadius: 8, border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>{TYPE_OPTIONS.find((t) => t.value === n.type)?.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{n.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{n.type}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="btn-icon" onClick={() => loadNotification(n)} style={{ fontSize: 12 }}>✏️</button>
                <button className="btn-icon" onClick={() => handleDelete(n.id)} style={{ fontSize: 12 }}>🗑️</button>
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", color: "var(--text-muted)", padding: 20 }}>
              No notifications configured
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: 16, background: "var(--bg3)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 12 }}>
              {editId ? "Edit Notification" : "Add Notification"}
            </div>

            <div className="form-group">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My Alert" required />
            </div>

            <div className="form-group">
              <label>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, config: {} })}>
                {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>

            {currentFields.map((field) => (
              <div key={field.key} className="form-group">
                <label>{field.label}{field.optional && " (optional)"}</label>
                <input
                  value={form.config[field.key] || ""}
                  onChange={(e) => setForm({ ...form, config: { ...form.config, [field.key]: e.target.value } })}
                  placeholder={field.placeholder}
                  required={!field.optional}
                />
              </div>
            ))}

            {error && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 8 }}>{error}</div>}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button type="button" className="btn-ghost" onClick={handleTest} disabled={testing} style={{ flex: 1 }}>
                {testing ? "Testing..." : "Test"}
              </button>
              <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
                {loading ? "..." : editId ? "Save" : "Add"}
              </button>
            </div>

            {testResult && (
              <div style={{
                marginTop: 8, padding: 8, borderRadius: 4, fontSize: 12,
                background: testResult.success ? "var(--green-bg)" : "var(--red-bg)",
                color: testResult.success ? "var(--green)" : "var(--red)",
              }}>
                {testResult.success ? "Test sent!" : testResult.error}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            {editId && <button type="button" className="btn-ghost" onClick={resetForm}>New</button>}
            <button type="button" className="btn-ghost" onClick={onClose}>Close</button>
          </div>
        </form>
      </div>
    </div>
  );
}