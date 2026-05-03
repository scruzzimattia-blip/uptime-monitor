import React, { useState } from "react";
import api from "../lib/api";

interface Props {
  onLogin: () => void;
}

export default function Login({ onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post<{ token: string }>("/auth/login", { username, password });
      localStorage.setItem("token", data.token);
      onLogin();
    } catch {
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      padding: 20,
    }}>
      {/* Background glow */}
      <div style={{
        position: "absolute",
        width: 600, height: 600,
        background: "radial-gradient(circle, rgba(79,128,255,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        width: "100%",
        maxWidth: 380,
        animation: "slideUp 0.25s ease",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52,
            background: "linear-gradient(135deg, var(--blue), var(--purple))",
            borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, margin: "0 auto 14px",
            boxShadow: "0 4px 20px rgba(79,128,255,0.35)",
          }}>⬆</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" }}>Uptime Monitor</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>Sign in to your dashboard</p>
        </div>

        <div style={{
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "28px",
          boxShadow: "var(--shadow-lg)",
        }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
                placeholder="admin"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div style={{
                padding: "9px 12px",
                background: "var(--red-bg)",
                border: "1px solid rgba(240,69,90,0.2)",
                borderRadius: 6,
                color: "var(--red)",
                fontSize: 12,
                marginBottom: 14,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              style={{ width: "100%", padding: "10px", fontSize: 14 }}
              disabled={loading}
            >
              {loading
                ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <span className="spinner" style={{ width: 14, height: 14, borderTopColor: "#fff" }} />
                    Signing in…
                  </span>
                : "Sign In"
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
