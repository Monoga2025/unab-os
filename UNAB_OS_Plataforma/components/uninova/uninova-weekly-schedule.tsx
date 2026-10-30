"use client";

import React, { useState } from "react";

interface ScheduleBlock {
  id: string;
  subject: string;
  code: string;
  timeRange: string;
  day: "Lunes" | "Martes" | "Miércoles" | "Jueves" | "Viernes";
  dayIndex: number;
  location: string;
  professor: string;
  color: string;
  pendingTasksCount: number;
}

const WEEK_SCHEDULE: ScheduleBlock[] = [
  // Lunes
  {
    id: "l1",
    subject: "Cálculo Multivariable & EDO",
    code: "MAT-203",
    timeRange: "7:00 AM - 8:30 AM",
    day: "Lunes",
    dayIndex: 1,
    location: "Bloque A · Aula 302",
    professor: "Dra. Martha Cecilia Jaimes",
    color: "rgba(59, 130, 246, 0.15)",
    pendingTasksCount: 1,
  },
  {
    id: "l2",
    subject: "Dinámica y Mecanismos (4 Barras)",
    code: "MEC-302",
    timeRange: "10:00 AM - 12:00 PM",
    day: "Lunes",
    dayIndex: 1,
    location: "Lab Mecatrónica · D-102",
    professor: "Ing. Hernán Ospina",
    color: "rgba(245, 158, 11, 0.15)",
    pendingTasksCount: 1,
  },

  // Martes
  {
    id: "m1",
    subject: "Circuitos Eléctricos & Sistemas",
    code: "MEC-301",
    timeRange: "8:00 AM - 10:00 AM",
    day: "Martes",
    dayIndex: 2,
    location: "Bloque D · Aula 204",
    professor: "Ing. Ricardo Duarte",
    color: "rgba(16, 185, 129, 0.15)",
    pendingTasksCount: 1,
  },
  {
    id: "m2",
    subject: "Física: Ondas y Partículas",
    code: "FIS-204",
    timeRange: "2:00 PM - 4:00 PM",
    day: "Martes",
    dayIndex: 2,
    location: "Lab Física · E-201",
    professor: "Dr. Gabriel Torres",
    color: "rgba(139, 92, 246, 0.15)",
    pendingTasksCount: 0,
  },

  // Miércoles
  {
    id: "w1",
    subject: "Cálculo Multivariable & EDO",
    code: "MAT-203",
    timeRange: "7:00 AM - 8:30 AM",
    day: "Miércoles",
    dayIndex: 3,
    location: "Bloque A · Aula 302",
    professor: "Dra. Martha Cecilia Jaimes",
    color: "rgba(59, 130, 246, 0.15)",
    pendingTasksCount: 1,
  },
  {
    id: "w2",
    subject: "Dinámica y Mecanismos",
    code: "MEC-302",
    timeRange: "10:00 AM - 12:00 PM",
    day: "Miércoles",
    dayIndex: 3,
    location: "Lab Mecatrónica · D-102",
    professor: "Ing. Hernán Ospina",
    color: "rgba(245, 158, 11, 0.15)",
    pendingTasksCount: 1,
  },
  {
    id: "w3",
    subject: "Álgebra Lineal Aplicada",
    code: "MAT-205",
    timeRange: "4:00 PM - 6:00 PM",
    day: "Miércoles",
    dayIndex: 3,
    location: "Bloque D · Aula 208",
    professor: "Ing. Claudia Serrano",
    color: "rgba(236, 72, 153, 0.15)",
    pendingTasksCount: 0,
  },

  // Jueves
  {
    id: "j1",
    subject: "Circuitos Eléctricos & Sistemas",
    code: "MEC-301",
    timeRange: "8:00 AM - 10:00 AM",
    day: "Jueves",
    dayIndex: 4,
    location: "Bloque D · Aula 204",
    professor: "Ing. Ricardo Duarte",
    color: "rgba(16, 185, 129, 0.15)",
    pendingTasksCount: 1,
  },

  // Viernes
  {
    id: "v1",
    subject: "Cálculo Multivariable & EDO",
    code: "MAT-203",
    timeRange: "7:00 AM - 8:30 AM",
    day: "Viernes",
    dayIndex: 5,
    location: "Bloque A · Aula 302",
    professor: "Dra. Martha Cecilia Jaimes",
    color: "rgba(59, 130, 246, 0.15)",
    pendingTasksCount: 1,
  },
  {
    id: "v2",
    subject: "Física: Ondas y Partículas",
    code: "FIS-204",
    timeRange: "2:00 PM - 4:00 PM",
    day: "Viernes",
    dayIndex: 5,
    location: "Lab Física · E-201",
    professor: "Dr. Gabriel Torres",
    color: "rgba(139, 92, 246, 0.15)",
    pendingTasksCount: 0,
  },
];

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] as const;

export interface UniNovaWeeklyScheduleProps {
  enrolledCourses?: string[];
  isDanielMonoga?: boolean;
  onOpenTemaSync?: () => void;
}

export function UniNovaWeeklySchedule({
  enrolledCourses = [],
  isDanielMonoga = false,
  onOpenTemaSync,
}: UniNovaWeeklyScheduleProps) {
  const [selectedDay, setSelectedDay] = useState<string>("all");

  const hasCourses = isDanielMonoga || enrolledCourses.length > 0;

  if (!hasCourses) {
    return (
      <div
        style={{
          padding: "48px 24px",
          textAlign: "center",
          borderRadius: "18px",
          background: "var(--color-bg-surface)",
          border: "1px dashed var(--color-border)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
          width: "100%",
        }}
      >
        <div style={{ fontSize: "3rem" }}>⏰</div>
        <div style={{ maxWidth: "460px" }}>
          <h3 style={{ margin: "0 0 6px 0", fontSize: "1.2rem", fontWeight: 800, color: "var(--color-text)" }}>
            Sin horario de clases registrado
          </h3>
          <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
            No se encontraron materias inscritas en tu cuenta institucional. Sincroniza con Moodle TEMA para cargar tu horario semanal oficial y salones de clase.
          </p>
        </div>
        {onOpenTemaSync && (
          <button
            type="button"
            className="uninova-btn-primary"
            onClick={onOpenTemaSync}
            style={{ marginTop: "8px" }}
          >
            ⚡ Sincronizar Horario con Moodle TEMA
          </button>
        )}
      </div>
    );
  }

  const visibleBlocks = selectedDay === "all"
    ? WEEK_SCHEDULE
    : WEEK_SCHEDULE.filter((b) => b.day === selectedDay);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          padding: "16px 20px",
          borderRadius: "16px",
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--color-text)" }}>
            ⏰ Horario Semanal & Salones UNAB
          </h2>
          <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
            Semestre 2026-1 · Ingeniería Mecatrónica · Campus El Jardín
          </p>
        </div>

        {/* Day Filter Pills */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setSelectedDay("all")}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 700,
              border: selectedDay === "all" ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
              background: selectedDay === "all" ? "var(--color-primary-soft)" : "var(--color-bg-subtle)",
              color: selectedDay === "all" ? "var(--color-primary-strong)" : "var(--color-text-muted)",
              cursor: "pointer",
            }}
          >
            Toda la semana
          </button>
          {DAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "0.78rem",
                fontWeight: 700,
                border: selectedDay === day ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                background: selectedDay === day ? "var(--color-primary-soft)" : "var(--color-bg-subtle)",
                color: selectedDay === day ? "var(--color-primary-strong)" : "var(--color-text-muted)",
                cursor: "pointer",
              }}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Schedule Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "14px",
        }}
      >
        {visibleBlocks.map((block) => (
          <div
            key={block.id}
            style={{
              padding: "16px",
              borderRadius: "16px",
              background: "var(--color-bg-surface)",
              border: "1px solid var(--color-border)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div>
              {/* Day & Time */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: "6px",
                    background: block.color,
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    color: "var(--color-text)",
                  }}
                >
                  {block.day} · {block.timeRange}
                </span>
                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--color-text-muted)" }}>
                  {block.code}
                </span>
              </div>

              {/* Subject */}
              <h3 style={{ margin: "0 0 4px 0", fontSize: "0.98rem", fontWeight: 800, color: "var(--color-text)" }}>
                {block.subject}
              </h3>

              {/* Location & Teacher */}
              <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: "2px" }}>
                <span>📍 {block.location}</span>
                <span>👨‍🏫 {block.professor}</span>
              </div>
            </div>

            {/* Task state */}
            <div
              style={{
                padding: "8px 10px",
                borderRadius: "8px",
                background: "var(--color-bg-subtle)",
                fontSize: "0.72rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ color: "var(--color-text-muted)" }}>Estado de entregas:</span>
              <span style={{ fontWeight: 800, color: block.pendingTasksCount > 0 ? "rgb(217, 119, 6)" : "rgb(22, 163, 74)" }}>
                {block.pendingTasksCount > 0 ? `🚨 ${block.pendingTasksCount} tarea pendiente` : "✅ Al día"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
