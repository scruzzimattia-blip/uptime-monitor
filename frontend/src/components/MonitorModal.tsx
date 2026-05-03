import React, { useState } from "react";
import api, { type Monitor } from "../lib/api";

interface Props {
  monitor?: Monitor;
  onClose: () => void;
  onSaved: () => void;
}

const DEFAULTS = {
  name: "",
  type: "http",
  url: "",
  interval: 60,
  timeout: 30,
  retries: 1,
  method: "GET",
  acceptedStatusCodes: "200-299",
  keyword: "",
  dnsResolveType: "A",
  dnsResolveServer: "",
  maxRedirects: 10,
};

export default function MonitorModal({ monitor, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: monitor?.name ?? DEFAULTS.name,
    type: monitor?.type ?? DEFAULTS.type,
    url: monitor?.url ?? DEFAULTS.url,
    interval: monitor?.interval ?? DEFAULTS.interval,
    timeout: monitor?.timeout ?? DEFAULTS.timeout,
    retries: monitor?.retries ?? DEFAULTS.retries,
    method: monitor?.method ?? DEFAULTS.method,
    acceptedStatusCodes: monitor?.acceptedStatusCodes?.join(", ") ?? DEFAULTS.acceptedStatusCodes,
    keyword: monitor?.keyword ?? DEFAULTS.keyword,
    dnsResolveType: monitor?.dnsResolveType ?? DEFAULTS.dnsResolveType,
    dnsResolveServer: monitor?.dnsResolveServer ?? DEFAULTS.dnsResolveServer,
    maxRedirects: monitor?.maxRedirects ?? DEFAULTS.maxRedirects,
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
        interval: Number(form.interval),
        timeout: Number(form.timeout),
        retries: Number(form.retries),
        maxRedirects: Number(form.maxRedirects),
        acceptedStatusCodes: form.acceptedStatusCodes.split(",").map((s) => s.trim()).filter(Boolean),
        keyword: form.keyword || undefined,
        dnsResolveType: form.type === "dns" ? form.dnsResolveType : undefined,
        dnsResolveServer: form.type === "dns" && form.dnsResolveServer ? form.dnsResolveServer : undefined,
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
    http: "https://example.com",
    https: "https://example.com",
    tcp: "hostname:port",
    ping: "hostname or IP",
    icmp: "hostname or IP",
    dns: "example.com",
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>{monitor ? "Edit Monitor" : "Add Monitor"}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label>Type</label>
              <select value={form.type} onChange={(e) => set("type", e.target.value)}>
                <option value="http">HTTP/HTTPS</option>
                <option value="tcp">TCP Port</option>
                <option value="ping">Ping (ICMP)</option>
                <option value="dns">DNS Lookup</option>
              </select>
            </div>
            {(form.type === "http" || form.type === "https") && (
              <div className="form-group">
                <label>Method</label>
                <select value={form.method} onChange={(e) => set("method", e.target.value)}>
                  {["GET", "POST", "PUT", "HEAD", "OPTIONS"].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>URL / Host</label>
            <input
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
              placeholder={urlPlaceholder[form.type] ?? ""}
              required
            />
          </div>

          {(form.type === "http" || form.type === "https") && (
            <>
              <div className="form-group">
                <label>Accepted Status Codes (comma-separated)</label>
                <input
                  value={form.acceptedStatusCodes}
                  onChange={(e) => set("acceptedStatusCodes", e.target.value)}
                  placeholder="200-299, 301"
                />
              </div>
              <div className="form-group">
                <label>Keyword (optional — must appear in response body)</label>
                <input
                  value={form.keyword}
                  onChange={(e) => set("keyword", e.target.value)}
                  placeholder="Expected keyword"
                />
              </div>
              <div className="form-group">
                <label>Max Redirects</label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={form.maxRedirects}
                  onChange={(e) => set("maxRedirects", e.target.value)}
                />
              </div>
            </>
          )}

          {form.type === "dns" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label>Record Type</label>
                <select value={form.dnsResolveType} onChange={(e) => set("dnsResolveType", e.target.value)}>
                  {["A", "AAAA", "MX", "CNAME", "TXT"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>DNS Server (optional)</label>
                <input
                  value={form.dnsResolveServer}
                  onChange={(e) => set("dnsResolveServer", e.target.value)}
                  placeholder="8.8.8.8"
                />
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label>Interval (s)</label>
              <input type="number" min={20} max={86400} value={form.interval} onChange={(e) => set("interval", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Timeout (s)</label>
              <input type="number" min={1} max={60} value={form.timeout} onChange={(e) => set("timeout", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Retries</label>
              <input type="number" min={0} max={10} value={form.retries} onChange={(e) => set("retries", e.target.value)} />
            </div>
          </div>

          {error && <p style={{ color: "var(--red)", marginBottom: 12 }}>{error}</p>}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Saving..." : monitor ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
