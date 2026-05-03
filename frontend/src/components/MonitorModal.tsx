import React, { useState } from "react";
import api, { type Monitor } from "../lib/api";

interface Props {
  monitor?: Monitor;
  onClose: () => void;
  onSaved: () => void;
}

const TYPE_ICONS: Record<string, string> = {
  http: "🌐", tcp: "🔌", ping: "📡", dns: "🔍",
};

const DEFAULTS = {
  name: "", type: "http", url: "", interval: 60, timeout: 30, retries: 1,
  method: "GET", acceptedStatusCodes: "200-299", keyword: "",
  dnsResolveType: "A", dnsResolveServer: "", maxRedirects:10, ignoreTls: false,
};

export default function MonitorModal({ monitor, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name:               monitor?.name               ?? DEFAULTS.name,
    type:               monitor?.type               ?? DEFAULTS.type,
    url:                monitor?.url                ?? DEFAULTS.url,
    interval:           monitor?.interval           ?? DEFAULTS.interval,
    timeout:            monitor?.timeout            ?? DEFAULTS.timeout,
    retries:            monitor?.retries            ?? DEFAULTS.retries,
    method:             monitor?.method             ?? DEFAULTS.method,
    acceptedStatusCodes: monitor?.acceptedStatusCodes?.join(", ") ?? DEFAULTS.acceptedStatusCodes,
    keyword:            monitor?.keyword            ?? DEFAULTS.keyword,
    dnsResolveType:     monitor?.dnsResolveType     ?? DEFAULTS.dnsResolveType,
    dnsResolveServer:   monitor?.dnsResolveServer   ?? DEFAULTS.dnsResolveServer,
    maxRedirects:       monitor?.maxRedirects        ?? DEFAULTS.maxRedirects,
    ignoreTls:          monitor?.ignoreTls           ?? DEFAULTS.ignoreTls,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form, v: unknown) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        ...form,
        interval:     Number(form.interval),
        timeout:      Number(form.timeout),
        retries:      Number(form.retries),
        maxRedirects: Number(form.maxRedirects),
        acceptedStatusCodes: form.acceptedStatusCodes.split(",").map((s) => s.trim()).filter(Boolean),
        keyword:           form.keyword || undefined,
        dnsResolveType:    form.type === "dns" ? form.dnsResolveType : undefined,
        dnsResolveServer:  form.type === "dns" && form.dnsResolveServer ? form.dnsResolveServer : undefined,
        ignoreTls:         isHttp ? form.ignoreTls : undefined,
      };
      if (monitor) {
        await api.put(`/monitors/${monitor.id}`, payload);
      } else {
        await api.post("/monitors", payload);
      }
      onSaved();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Failed to save monitor");
    } finally {
      setLoading(false);
    }
  };

  const urlPlaceholder: Record<string, string> = {
    http: "https://example.com", https: "https://example.com",
    tcp: "hostname:8080", ping: "192.168.1.1", icmp: "192.168.1.1",
    dns: "example.com",
  };

  const isHttp = form.type === "http" || form.type === "https";

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">
          <span style={{ fontSize: 20 }}>{TYPE_ICONS[form.type] ?? "📊"}</span>
          {monitor ? "Edit Monitor" : "Add Monitor"}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Display Name</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="My Website"
              required
            />
          </div>

          {/* Type selector as pills */}
          <div className="form-group">
            <label>Monitor Type</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { value: "http",  label: "HTTP/HTTPS", icon: "🌐" },
                { value: "tcp",   label: "TCP Port",   icon: "🔌" },
                { value: "ping",  label: "Ping",       icon: "📡" },
                { value: "dns",   label: "DNS",        icon: "🔍" },
              ].map(({ value, label, icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("type", value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500,
                    background: form.type === value ? "var(--blue-bg)" : "var(--bg3)",
                    color: form.type === value ? "var(--blue)" : "var(--text-muted)",
                    border: form.type === value ? "1px solid rgba(79,128,255,0.4)" : "1px solid var(--border)",
                  }}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isHttp ? "1fr auto" : "1fr", gap: 10 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>URL / Host</label>
              <input
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder={urlPlaceholder[form.type] ?? ""}
                required
              />
            </div>
            {isHttp && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Method</label>
                <select value={form.method} onChange={(e) => set("method", e.target.value)} style={{ width: 90 }}>
                  {["GET", "POST", "PUT", "HEAD", "OPTIONS"].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {isHttp && (
            <div style={{ marginTop: 12, padding: "14px", background: "var(--bg3)", borderRadius: 8, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                HTTP Options
              </div>
              <div className="form-group">
                <label>Accepted Status Codes</label>
                <input
                  value={form.acceptedStatusCodes}
                  onChange={(e) => set("acceptedStatusCodes", e.target.value)}
                  placeholder="200-299, 301"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Keyword (optional)</label>
                  <input
                    value={form.keyword}
                    onChange={(e) => set("keyword", e.target.value)}
                    placeholder="Must appear in response"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Max Redirects</label>
                  <input type="number" min={0} max={20} value={form.maxRedirects}
                    onChange={(e) => set("maxRedirects", e.target.value)} />
                </div>
              </div>
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  id="ignoreTls"
                  checked={form.ignoreTls}
                  onChange={(e) => set("ignoreTls", e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <label htmlFor="ignoreTls" style={{ fontSize: 13, color: "var(--text-muted)", cursor: "pointer" }}>
                  Ignore invalid TLS certificate
                </label>
              </div>
            </div>
          )}

          {form.type === "dns" && (
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Record Type</label>
                <select value={form.dnsResolveType} onChange={(e) => set("dnsResolveType", e.target.value)}>
                  {["A", "AAAA", "MX", "CNAME", "TXT"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>DNS Server</label>
                <input value={form.dnsResolveServer} onChange={(e) => set("dnsResolveServer", e.target.value)} placeholder="8.8.8.8 (optional)" />
              </div>
            </div>
          )}

          {/* Timing */}
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { key: "interval", label: "Interval (s)", min: 20, max: 86400 },
              { key: "timeout",  label: "Timeout (s)",  min: 1,  max: 60 },
              { key: "retries",  label: "Retries",      min: 0,  max: 10 },
            ].map(({ key, label, min, max }) => (
              <div key={key} className="form-group" style={{ marginBottom: 0 }}>
                <label>{label}</label>
                <input
                  type="number" min={min} max={max}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => set(key as keyof typeof form, e.target.value)}
                />
              </div>
            ))}
          </div>

          {error && (
            <div style={{
              marginTop: 14, padding: "10px 12px",
              background: "var(--red-bg)", border: "1px solid rgba(240,69,90,0.25)",
              borderRadius: 6, color: "var(--red)", fontSize: 12,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading} style={{ minWidth: 90 }}>
              {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : monitor ? "Save Changes" : "Create Monitor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
