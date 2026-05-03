import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PublicStatus from "./pages/PublicStatus";

function AuthGate() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem("token"));

  if (!authed) {
    return <Login onLogin={() => setAuthed(true)} />;
  }
  return <Dashboard onLogout={() => setAuthed(false)} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/status/:slug" element={<PublicStatus />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/*" element={<AuthGate />} />
      </Routes>
    </BrowserRouter>
  );
}
