"use client";

import React, { useState } from "react";
import Link from "next/link";
import { TelegramPairingCard, type TelegramPairingStatus } from "@/components/telegram-pairing-card";
import type { AcademicAgendaEntry } from "@/lib/domain/academic-collaboration";

export interface UniNovaTacticalCockpitProps {
  userName: string;
  userRole?: string;
  enrolledCount?: number;
  evaluationsCount?: number;
  temaFilesCount?: number;
  telegramStatus?: TelegramPairingStatus;
  agendaEvents?: Array<{
    id: string;
    timeRange: string;
    title: string;
    location: string;
    colorVar: string;
  }>;
  rawAgenda?: AcademicAgendaEntry[];
  onNavigateTab: (tab: "agenda" | "horario" | "docentes") => void;
}

interface TacticalCourseScheduleTask {
  id: string;
  name: string;
  code: string;
  professor: string;
  schedule: string;
  location: string;
  taskStatus: "urgent" | "pending" | "safe";
  taskStatusText: string;
  activeTaskTitle: string;
  taskDeadline: string;
  taskDaysLeft: string;
}

const TACTICAL_COURSES: TacticalCourseScheduleTask[] = [
  {
    id: "dinamica",
    name: "Dinámica y Mecanismos (4 Barras)",
    code: "MEC-302",
    professor: "Ing. Hernán Ospina",
    schedule: "Lun y Mié · 10:00 AM a 12:00 PM",
    location: "Lab Mecatrónica · D-102",
    taskStatus: "urgent",
    taskStatusText: "🚨 Vence Hoy (11:59 PM)",
    activeTaskTitle: "Taller Grashof 4 Barras & Síntesis",
    taskDeadline: "Hoy a las 11:59 PM",
    taskDaysLeft: "Quedan 14h 20m",
  },
  {
    id: "circuitos",
    name: "Circuitos Eléctricos & Sistemas",
    code: "MEC-301",
    professor: "Ing. Ricardo Duarte",
    schedule: "Mar y Jue · 8:00 AM a 10:00 AM",
    location: "Bloque D · Aula 204",
    taskStatus: "pending",
    taskStatusText: "⏳ Próxima Entrega",
    activeTaskTitle: "Quiz y Taller de Fasores RLC",
    taskDeadline: "Jueves 8:00 AM",
    taskDaysLeft: "En 5 días",
  },
  {
    id: "edo",
    name: "Cálculo Multivariable & EDO",
    code: "MAT-203",
    professor: "Dra. Martha Cecilia Jaimes",
    schedule: "Lun, Mié y Vie · 7:00 AM a 8:30 AM",
    location: "Bloque A · Aula 302",
    taskStatus: "pending",
    taskStatusText: "⏳ En 3 Días",
    activeTaskTitle: "Taller EDO Bernoulli & Linealización",
    taskDeadline: "Martes 7:00 AM",
    taskDaysLeft: "En 3 días",
  },
  {
    id: "ondas",
    name: "Física: Ondas y Partículas",
    code: "FIS-204",
    professor: "Dr. Gabriel Torres",
    schedule: "Mar y Vie · 2:00 PM a 4:00 PM",
    location: "Lab Física · E-201",
    taskStatus: "safe",
    taskStatusText: "✅ Al Día",
    activeTaskTitle: "Informe Lab Movimiento Armónico Simple",
    taskDeadline: "Próximo Viernes",
    taskDaysLeft: "En 9 días",
  },
];

export function UniNovaTacticalCockpit({
  userName,
  telegramStatus,
  rawAgenda = [],
  onNavigateTab,
}: UniNovaTacticalCockpitProps) {
  const [activeNoticeDismissed, setActiveNoticeDismissed] = useState(false);

  return (
    <div className="uninova-tactical-cockpit" style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
      {/* 1. TACTICAL TICKER HEADER (High Contrast & Zero Generic Fluff) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          padding: "12px 18px",
          borderRadius: "14px",
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "999px",
              background: "rgba(34, 197, 94, 0.12)",
              color: "rgb(22, 163, 74)",
              fontSize: "0.72rem",
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "rgb(34, 197, 94)",
                boxShadow: "0 0 8px rgb(34, 197, 94)",
              }}
            />
            RADAR EN VIVO
          </span>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-text)" }}>
            Semestre 2026-1 · Ingeniería Mecatrónica UNAB
          </span>
          <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
            · Estudiante: <strong>{userName}</strong>
          </span>
        </div>

        {/* 1-Tap Quick Survival Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => onNavigateTab("horario")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid var(--color-border)",
              background: "var(--color-bg-subtle)",
              color: "var(--color-text)",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ⏰ Mi Horario Semanal
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab("agenda")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid var(--color-border)",
              background: "var(--color-bg-subtle)",
              color: "var(--color-text)",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            📅 Calendario de Entregas
          </button>
          <a
            href="https://tema.unab.edu.co"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "8px",
              border: "none",
              background: "var(--color-primary)",
              color: "var(--color-text-inverse)",
              fontSize: "0.78rem",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            ⚡ Moodle TEMA Oficial ↗
          </a>
        </div>
      </div>

      {/* 2. HERO ASYMMETRIC BENTO GRID (Row 1: Critical 24h Radar + Jarvis Hologram) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "16px",
          alignItems: "stretch",
        }}
      >
        {/* HERO CARD A: Radar 24h & Entrega Crítica (Dominant 60%) */}
        <div
          style={{
            flex: "1 1 58%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "24px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, var(--color-bg-surface) 0%, rgba(245, 158, 11, 0.03) 100%)",
            border: "1.5px solid rgba(245, 158, 11, 0.35)",
            boxShadow: "0 8px 30px rgba(245, 158, 11, 0.08)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div>
            {/* Top Eyebrow with Live Countdown */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  background: "rgba(220, 38, 38, 0.12)",
                  color: "rgb(220, 38, 38)",
                  fontSize: "0.72rem",
                  fontWeight: 900,
                  letterSpacing: "0.05em",
                }}
              >
                🚨 PRIORIDAD MÁXIMA HOY · FALTAN 14H 20M
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 600 }}>
                Cierre: Hoy 11:59 PM
              </span>
            </div>

            {/* Critical Activity Title */}
            <h2
              style={{
                margin: "0 0 8px 0",
                fontSize: "1.35rem",
                fontWeight: 800,
                color: "var(--color-text)",
                lineHeight: 1.25,
                letterSpacing: "-0.02em",
              }}
            >
              Taller de Dinámica & Mecanismos: Análisis de 4 Barras de Grashof
            </h2>
            <p
              style={{
                margin: "0 0 16px 0",
                fontSize: "0.85rem",
                color: "var(--color-text-muted)",
                lineHeight: 1.5,
              }}
            >
              Ing. Hernán Ospina · Lab Mecatrónica D-102 · Ponderación: <strong>15% del Corte 1</strong>. La plataforma registrará el informe en PDF oficial capturado de Moodle TEMA.
            </p>

            {/* Visual Time Progress Meter */}
            <div style={{ marginBottom: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: "4px" }}>
                <span style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>Tiempo transcurrido del plazo</span>
                <span style={{ color: "rgb(217, 119, 6)", fontWeight: 800 }}>82% consumido</span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "8px",
                  borderRadius: "999px",
                  background: "var(--color-border)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "82%",
                    height: "100%",
                    borderRadius: "999px",
                    background: "linear-gradient(90deg, rgb(245, 158, 11), rgb(220, 38, 38))",
                  }}
                />
              </div>
            </div>

            {/* Today's Schedule Strip (Aulas & Horarios de Hoy) */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "12px",
                background: "var(--color-bg-subtle)",
                border: "1px solid var(--color-border)",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "10px",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.1rem" }}>⚡</span>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--color-text)" }}>
                    8:00 AM · Circuitos Eléctricos
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--color-text-muted)" }}>
                    Bloque D Aula 204 · Prof. Duarte
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.1rem" }}>⚙️</span>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--color-text)" }}>
                    10:00 AM · Lab Mecatrónica
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--color-text-muted)" }}>
                    Edificio D Aula D-102 · Prof. Ospina
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <a
              href="https://tema.unab.edu.co"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                borderRadius: "10px",
                background: "rgb(217, 119, 6)",
                color: "#ffffff",
                fontSize: "0.84rem",
                fontWeight: 800,
                textDecoration: "none",
                boxShadow: "0 4px 12px rgba(217, 119, 6, 0.25)",
              }}
            >
              <span>Subir Taller en Moodle TEMA UNAB (tema.unab.edu.co) ↗</span>
            </a>
            <Link
              href="/tema"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 16px",
                borderRadius: "10px",
                background: "var(--color-bg-subtle)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
                fontSize: "0.84rem",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              📂 Ver Archivos TEMA
            </Link>
            <button
              type="button"
              onClick={() => onNavigateTab("horario")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 16px",
                borderRadius: "10px",
                background: "var(--color-bg-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
                fontSize: "0.84rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ⏰ Ver Horario Semanal
            </button>
          </div>
        </div>

        {/* HERO CARD B: Jarvis Neural Copilot (40% Column) */}
        <div
          style={{
            flex: "1 1 38%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px",
            borderRadius: "20px",
            background: "var(--color-bg-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
          }}
        >
          <TelegramPairingCard
            initialStatus={
              telegramStatus ?? {
                linked: false,
                telegramUserId: null,
                linkedAt: null,
                pendingCodeExpiresAt: null,
              }
            }
          />

          {/* Quick Telegram Automation Trigger Buttons */}
          <div
            style={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              marginTop: "12px",
              borderTop: "1px solid var(--color-border)",
              paddingTop: "12px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                alert("🔔 Recordatorio programado: Jarvis te notificará por Telegram 2 horas antes de cada entrega y parcial.");
              }}
              style={{
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                background: "var(--color-bg-subtle)",
                color: "var(--color-text)",
                fontSize: "0.72rem",
                fontWeight: 700,
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              🔔 Recordar 2h antes
            </button>

            <a
              href="https://t.me/JarvisUnabBot"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "8px 10px",
                borderRadius: "8px",
                border: "none",
                background: "rgba(2, 132, 199, 0.12)",
                color: "rgb(2, 132, 199)",
                fontSize: "0.72rem",
                fontWeight: 800,
                cursor: "pointer",
                textAlign: "center",
                textDecoration: "none",
                display: "grid",
                placeItems: "center",
              }}
            >
              💬 Abrir Chat Jarvis ↗
            </a>
          </div>
        </div>
      </div>

      {/* 3. HORARIOS & CARGA DE TAREAS POR ASIGNATURA (Bento 4 Columns) */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "var(--color-text)" }}>
              ⏰ Horarios de Clase & Carga de Tareas
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.76rem", color: "var(--color-text-muted)" }}>
              Asignaturas de Mecatrónica: salones de clase, horarios semanales y próximas entregas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab("horario")}
            style={{
              fontSize: "0.75rem",
              fontWeight: 800,
              color: "var(--color-primary)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            Ver Horario Completo →
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "14px",
          }}
        >
          {TACTICAL_COURSES.map((course) => {
            const isUrgent = course.taskStatus === "urgent";
            const isPending = course.taskStatus === "pending";
            const statusBg = isUrgent
              ? "rgba(220, 38, 38, 0.12)"
              : isPending
              ? "rgba(245, 158, 11, 0.12)"
              : "rgba(34, 197, 94, 0.12)";
            const statusColor = isUrgent
              ? "rgb(220, 38, 38)"
              : isPending
              ? "rgb(180, 83, 9)"
              : "rgb(22, 163, 74)";

            return (
              <div
                key={course.id}
                style={{
                  padding: "16px",
                  borderRadius: "16px",
                  background: "var(--color-bg-surface)",
                  border: isUrgent ? "1.5px solid rgba(220, 38, 38, 0.4)" : "1px solid var(--color-border)",
                  boxShadow: isUrgent ? "0 4px 14px rgba(220, 38, 38, 0.08)" : "0 2px 6px rgba(0, 0, 0, 0.02)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div>
                  {/* Top Subject Code & Task Status */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--color-text-muted)" }}>
                      {course.code}
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "999px",
                        background: statusBg,
                        color: statusColor,
                        fontSize: "0.65rem",
                        fontWeight: 800,
                      }}
                    >
                      {course.taskStatusText}
                    </span>
                  </div>

                  {/* Subject Name */}
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--color-text)", marginBottom: "8px" }}>
                    {course.name}
                  </div>

                  {/* Class Time & Location Box */}
                  <div
                    style={{
                      padding: "10px",
                      borderRadius: "10px",
                      background: "var(--color-bg-subtle)",
                      border: "1px solid var(--color-border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      marginBottom: "10px",
                      fontSize: "0.75rem",
                    }}
                  >
                    <div style={{ fontWeight: 800, color: "var(--color-text)" }}>
                      ⏰ {course.schedule}
                    </div>
                    <div style={{ color: "var(--color-text-muted)" }}>
                      📍 {course.location}
                    </div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: "0.70rem" }}>
                      👨‍🏫 {course.professor}
                    </div>
                  </div>
                </div>

                {/* Bottom Active Task Info */}
                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: "8px",
                    background: isUrgent ? "rgba(220, 38, 38, 0.06)" : "var(--color-bg-subtle)",
                    fontSize: "0.72rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  <span style={{ fontWeight: 700, color: isUrgent ? "rgb(220, 38, 38)" : "var(--color-text)" }}>
                    📝 {course.activeTaskTitle}
                  </span>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-text-muted)", fontSize: "0.68rem" }}>
                    <span>Plazo: {course.taskDeadline}</span>
                    <span style={{ fontWeight: 800, color: isUrgent ? "rgb(220, 38, 38)" : "var(--color-primary)" }}>
                      {course.taskDaysLeft}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. CRONOGRAMA DE PARCIALES & DIRECTORIO RÁPIDO (Split Row 7 + 5) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "16px",
          alignItems: "start",
        }}
      >
        {/* Left: Cronograma de Parciales Inamovibles */}
        <div
          style={{
            flex: "1 1 58%",
            padding: "20px",
            borderRadius: "18px",
            background: "var(--color-bg-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "var(--color-text)" }}>
                📅 Próximos Parciales & Quices Oficiales
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                Fechas institucionales sincronizadas con el calendario UNAB.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("agenda")}
              style={{
                fontSize: "0.74rem",
                fontWeight: 700,
                color: "var(--color-primary)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              Ver todos →
            </button>
          </div>

          {/* Agenda Event Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {(rawAgenda.length > 0 ? rawAgenda.slice(0, 4) : [
              {
                id: "eval-1",
                title: "Taller Grashof 4 Barras",
                subjectName: "Dinámica y Mecanismos",
                professorName: "Ing. Hernán Ospina",
                occursAt: new Date(Date.now() + 14 * 3600 * 1000).toISOString(),
                importance: "alta",
                type: "taller",
              },
              {
                id: "eval-2",
                title: "Parcial EDO Bernoulli & Linealización",
                subjectName: "Cálculo Multivariable & EDO",
                professorName: "Dra. Martha C. Jaimes",
                occursAt: new Date(Date.now() + 3 * 86400 * 1000).toISOString(),
                importance: "alta",
                type: "parcial",
              },
              {
                id: "eval-3",
                title: "Quiz Circuitos Fasores RLC",
                subjectName: "Circuitos Eléctricos",
                professorName: "Ing. Ricardo Duarte",
                occursAt: new Date(Date.now() + 5 * 86400 * 1000).toISOString(),
                importance: "media",
                type: "quiz",
              },
              {
                id: "eval-4",
                title: "Informe Lab Movimiento Armónico Simple",
                subjectName: "Física: Ondas y Partículas",
                professorName: "Dr. Gabriel Torres",
                occursAt: new Date(Date.now() + 9 * 86400 * 1000).toISOString(),
                importance: "media",
                type: "laboratorio",
              },
            ]).map((item, idx) => {
              const diffHours = Math.round((new Date(item.occursAt).getTime() - Date.now()) / (3600 * 1000));
              const isUrgent = diffHours <= 24;

              return (
                <div
                  key={item.id || idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    background: isUrgent ? "rgba(245, 158, 11, 0.06)" : "var(--color-bg-subtle)",
                    border: isUrgent ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid var(--color-border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: isUrgent ? "rgba(245, 158, 11, 0.18)" : "rgba(2, 132, 199, 0.12)",
                        color: isUrgent ? "rgb(180, 83, 9)" : "rgb(2, 132, 199)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "1rem",
                        fontWeight: 800,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--color-text)" }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                        {item.subjectName} · {item.professorName}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        background: isUrgent ? "rgba(220, 38, 38, 0.12)" : "rgba(0, 0, 0, 0.05)",
                        color: isUrgent ? "rgb(220, 38, 38)" : "var(--color-text-muted)",
                        fontSize: "0.68rem",
                        fontWeight: 800,
                      }}
                    >
                      {diffHours <= 24 ? `Quedan ${diffHours}h` : `En ${Math.round(diffHours / 24)} días`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Directorio Rápido & Aulas UNAB */}
        <div
          style={{
            flex: "1 1 38%",
            padding: "20px",
            borderRadius: "18px",
            background: "var(--color-bg-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "var(--color-text)" }}>
                🏛️ Salones & Contacto Rápido UNAB
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                Campus El Jardín · Facultad de Ingeniería
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("docentes")}
              style={{
                fontSize: "0.74rem",
                fontWeight: 700,
                color: "var(--color-primary)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              Directorio →
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                background: "var(--color-bg-subtle)",
                border: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--color-text)" }}>
                  Ing. Ricardo Duarte
                </div>
                <div style={{ fontSize: "0.70rem", color: "var(--color-text-muted)" }}>
                  Bloque D Aula 204 · user3@example.edu
                </div>
              </div>
              <a
                href="mailto:user3@example.edu"
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  background: "var(--color-primary-soft)",
                  color: "var(--color-primary-strong)",
                  fontSize: "0.70rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Escribir
              </a>
            </div>

            <div
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                background: "var(--color-bg-subtle)",
                border: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--color-text)" }}>
                  Ing. Hernán Ospina
                </div>
                <div style={{ fontSize: "0.70rem", color: "var(--color-text-muted)" }}>
                  Lab Mecatrónica D-102 · user4@example.edu
                </div>
              </div>
              <a
                href="mailto:user4@example.edu"
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  background: "var(--color-primary-soft)",
                  color: "var(--color-primary-strong)",
                  fontSize: "0.70rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Escribir
              </a>
            </div>

            <div
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                background: "var(--color-bg-subtle)",
                border: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--color-text)" }}>
                  Dra. Martha Cecilia Jaimes
                </div>
                <div style={{ fontSize: "0.70rem", color: "var(--color-text-muted)" }}>
                  Bloque A Aula 302 · user5@example.edu
                </div>
              </div>
              <a
                href="mailto:user5@example.edu"
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  background: "var(--color-primary-soft)",
                  color: "var(--color-primary-strong)",
                  fontSize: "0.70rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Escribir
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
