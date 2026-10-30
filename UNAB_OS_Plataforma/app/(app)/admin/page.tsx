"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  lastSignInAt: string;
  isConfirmed: boolean;
  telegramLinked: boolean;
  telegramUserId: string | null;
  telegramLinkedAt: string | null;
}

export default function AdminUsersDashboardPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json() as { success: boolean; users: AdminUser[]; count: number; error?: string };
      if (data.success) {
        setUsers(data.users || []);
        setError(null);
      } else {
        setError(data.error || "No se pudo cargar la lista de usuarios");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setLoading(false);
      setLastUpdated(new Date().toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }));
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchUsers();
    }, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return u.email.toLowerCase().includes(term) || u.displayName.toLowerCase().includes(term);
  });

  const tgLinkedCount = users.filter((u) => u.telegramLinked).length;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 20px 60px", color: "#0f172a" }}>
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#e0f2fe", color: "#0369a1", fontSize: "0.76rem", fontWeight: 800, padding: "3px 10px", borderRadius: "20px", marginBottom: "8px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#0284c7" }} />
            RADAR EN VIVO · TELEMETRÍA DE REGISTROS
          </div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 900, margin: 0, color: "#0f172a", letterSpacing: "-0.03em" }}>
            Estudiantes Registrados en UniNova
          </h1>
          <p style={{ fontSize: "0.88rem", color: "#64748b", margin: "4px 0 0", fontWeight: 500 }}>
            Supervisa en tiempo real quiénes han creado su usuario, iniciado sesión y vinculado Telegram.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              padding: "8px 14px",
              borderRadius: "10px",
              border: autoRefresh ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
              background: autoRefresh ? "#f0fdf4" : "#f8fafc",
              color: autoRefresh ? "#16a34a" : "#64748b",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: autoRefresh ? "#22c55e" : "#94a3b8" }} />
            {autoRefresh ? "Auto-recarga (10s) Activa" : "Pausada"}
          </button>

          <button
            type="button"
            onClick={fetchUsers}
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #0284c7, #0369a1)",
              color: "#ffffff",
              fontSize: "0.82rem",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(2, 132, 199, 0.25)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            🔄 Actualizar Ahora
          </button>

          <Link
            href="/dashboard"
            style={{
              padding: "8px 14px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#0f172a",
              fontSize: "0.82rem",
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            ← Volver al Dashboard
          </Link>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <div style={{ background: "#ffffff", border: "1px solid #f1f5f9", borderRadius: "14px", padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Total Registrados</div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#0284c7", margin: "4px 0" }}>{users.length}</div>
          <div style={{ fontSize: "0.78rem", color: "#10b981", fontWeight: 600 }}>● Estudiantes de Mecatrónica UNAB</div>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid #f1f5f9", borderRadius: "14px", padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Vinculados a Telegram</div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#10b981", margin: "4px 0" }}>{tgLinkedCount}</div>
          <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>Con Jarvis Bot activo</div>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid #f1f5f9", borderRadius: "14px", padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Última Actualización</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", margin: "8px 0" }}>{lastUpdated || "--:--"}</div>
          <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 500 }}>Hora de Colombia (Bogotá)</div>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", background: "#ffffff", border: "1px solid #f1f5f9", borderRadius: "12px", padding: "12px 16px", marginBottom: "16px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, maxWidth: "400px" }}>
          <span style={{ fontSize: "16px", color: "#94a3b8" }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por correo o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              fontSize: "0.88rem",
              color: "#0f172a",
              fontWeight: 600,
              background: "transparent",
            }}
          />
        </div>
        <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
          Mostrando {filteredUsers.length} de {users.length} estudiantes
        </span>
      </div>

      {/* ERROR OR LOADING */}
      {loading && (
        <div style={{ padding: "40px", textAlign: "center", background: "#ffffff", borderRadius: "14px", border: "1px solid #f1f5f9" }}>
          <span style={{ fontSize: "24px" }}>⏳</span>
          <p style={{ margin: "8px 0 0", color: "#64748b", fontWeight: 600 }}>Cargando registros en tiempo real...</p>
        </div>
      )}

      {error && (
        <div style={{ padding: "16px 20px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: "12px", color: "#dc2626", fontWeight: 700, fontSize: "0.88rem", marginBottom: "16px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* USERS TABLE */}
      {!loading && (
        <div style={{ background: "#ffffff", border: "1px solid #f1f5f9", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
          {filteredUsers.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
              <span style={{ fontSize: "32px" }}>📭</span>
              <p style={{ margin: "10px 0 0", fontSize: "0.92rem", fontWeight: 600 }}>
                {searchTerm ? "No se encontraron estudiantes que coincidan con la búsqueda." : "Aún no hay estudiantes registrados."}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "12px 16px", fontWeight: 800, color: "#475569", fontSize: "0.74rem", textTransform: "uppercase" }}>Estudiante</th>
                    <th style={{ padding: "12px 16px", fontWeight: 800, color: "#475569", fontSize: "0.74rem", textTransform: "uppercase" }}>Correo Institucional</th>
                    <th style={{ padding: "12px 16px", fontWeight: 800, color: "#475569", fontSize: "0.74rem", textTransform: "uppercase" }}>Fecha de Registro</th>
                    <th style={{ padding: "12px 16px", fontWeight: 800, color: "#475569", fontSize: "0.74rem", textTransform: "uppercase" }}>Último Acceso</th>
                    <th style={{ padding: "12px 16px", fontWeight: 800, color: "#475569", fontSize: "0.74rem", textTransform: "uppercase" }}>Telegram / Jarvis</th>
                    <th style={{ padding: "12px 16px", fontWeight: 800, color: "#475569", fontSize: "0.74rem", textTransform: "uppercase" }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, idx) => {
                    const initials = user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "UN";
                    const isDaniel = user.email.toLowerCase().includes("dmonoga");

                    return (
                      <tr key={user.id} style={{ borderBottom: idx !== filteredUsers.length - 1 ? "1px solid #f1f5f9" : "none", transition: "background 0.15s" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: isDaniel ? "#0284c7" : "#64748b", color: "#ffffff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: "0.75rem", flexShrink: 0 }}>
                              {initials}
                            </div>
                            <div>
                              <strong style={{ display: "block", color: "#0f172a", fontWeight: 800 }}>
                                {user.displayName}
                                {isDaniel && <span style={{ marginLeft: "6px", fontSize: "0.68rem", background: "#fef3c7", color: "#b45309", padding: "1px 5px", borderRadius: "4px" }}>Admin / Titular</span>}
                              </strong>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: "12px 16px", color: "#0284c7", fontWeight: 700, fontFamily: "monospace", fontSize: "0.82rem" }}>
                          {user.email}
                        </td>

                        <td style={{ padding: "12px 16px", color: "#64748b", fontWeight: 500, whiteSpace: "nowrap" }}>
                          {new Date(user.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                        </td>

                        <td style={{ padding: "12px 16px", color: "#64748b", fontWeight: 500, whiteSpace: "nowrap" }}>
                          {new Date(user.lastSignInAt).toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                        </td>

                        <td style={{ padding: "12px 16px" }}>
                          {user.telegramLinked ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#dcfce7", color: "#16a34a", padding: "2px 8px", borderRadius: "6px", fontSize: "0.74rem", fontWeight: 700 }}>
                              ● Vinculado
                            </span>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: "6px", fontSize: "0.74rem", fontWeight: 600 }}>
                              ○ No vinculado
                            </span>
                          )}
                        </td>

                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: "6px", fontSize: "0.74rem", fontWeight: 700 }}>
                            ✓ Activo
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
