"use client";

import React, { useState } from "react";

export interface UniNovaEnrollmentModalProps {
  userEmail?: string;
  initialSelected?: string[];
  onSave: (selectedCourses: string[]) => void;
  onClose: () => void;
}

export interface OfficialCourseItem {
  id: string;
  name: string;
  code: string;
  icon: string;
  colorVar: string;
  peers: string[];
}

export const OFFICIAL_UNAB_COURSES: OfficialCourseItem[] = [
  {
    id: "dibujo",
    name: "Dibujo en Ingeniería",
    code: "ING-102",
    icon: "✏️",
    colorVar: "#8b5cf6",
    peers: ["Daniel Monoga"],
  },
  {
    id: "circuitos",
    name: "Circuitos Eléctricos",
    code: "MEC-301",
    icon: "⚡",
    colorVar: "#0284c7",
    peers: ["Daniel Monoga"],
  },
  {
    id: "mecanismos",
    name: "Dinámica y Mecanismos",
    code: "MEC-302",
    icon: "⚙️",
    colorVar: "#10b981",
    peers: ["Daniel Monoga"],
  },
  {
    id: "calculo",
    name: "Cálculo Multivariable & EDO",
    code: "MAT-203",
    icon: "📐",
    colorVar: "#0ea5e9",
    peers: ["Daniel Monoga"],
  },
  {
    id: "estadistica",
    name: "Estadística Inferencial",
    code: "MAT-208",
    icon: "📊",
    colorVar: "#f43f5e",
    peers: ["Daniel Monoga"],
  },
  {
    id: "materiales",
    name: "Ciencia de Materiales",
    code: "MEC-305",
    icon: "🧪",
    colorVar: "#a855f7",
    peers: ["Daniel Monoga"],
  },
  {
    id: "ondas",
    name: "Física: Ondas y Partículas",
    code: "FIS-204",
    icon: "🔬",
    colorVar: "#ec4899",
    peers: ["Daniel Monoga"],
  },
  {
    id: "programacion",
    name: "Programación y Algoritmos",
    code: "SIS-104",
    icon: "💻",
    colorVar: "#0284c7",
    peers: ["Daniel Monoga"],
  },
  {
    id: "termo",
    name: "Termodinámica",
    code: "MEC-304",
    icon: "🌡️",
    colorVar: "#f97316",
    peers: ["Daniel Monoga"],
  },
  {
    id: "robotica",
    name: "Robótica & Automatización",
    code: "MEC-401",
    icon: "🤖",
    colorVar: "#10b981",
    peers: ["Daniel Monoga"],
  },
];

export function UniNovaEnrollmentModal({
  userEmail,
  initialSelected = [],
  onSave,
  onClose,
}: UniNovaEnrollmentModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedCourses, setSelectedCourses] = useState<string[]>(() => {
    if (initialSelected.length > 0) return initialSelected;
    return [
      "Dibujo en Ingeniería",
      "Circuitos Eléctricos",
      "Dinámica y Mecanismos",
      "Cálculo Multivariable & EDO",
      "Estadística Inferencial",
      "Ciencia de Materiales",
      "Física: Ondas",
    ];
  });

  const [customCourseName, setCustomCourseName] = useState("");
  const [customCourseCode, setCustomCourseCode] = useState("");
  const [isConfirmedPensum, setIsConfirmedPensum] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [expandedCoursePeers, setExpandedCoursePeers] = useState<Record<string, boolean>>({});

  const cleanEmail = (userEmail || (typeof window !== "undefined" ? localStorage.getItem("uninova_user_email") : null) || "user1@example.edu").toLowerCase();
  const studentPrefix = cleanEmail.split("@")[0] || "estudiante";
  const studentDisplayName = studentPrefix.charAt(0).toUpperCase() + studentPrefix.slice(1);

  const toggleCourse = (name: string) => {
    if (selectedCourses.includes(name)) {
      setSelectedCourses(selectedCourses.filter((c) => c !== name));
    } else {
      setSelectedCourses([...selectedCourses, name]);
    }
  };

  const handleCreateCustomCourse = (e: React.FormEvent) => {
    e.preventDefault();
    setCreationError(null);

    const nameTrimmed = customCourseName.trim();
    if (!nameTrimmed) {
      setCreationError("Por favor ingresa el nombre de la asignatura.");
      return;
    }

    // Check if already in official list or selected
    const alreadyExists = OFFICIAL_UNAB_COURSES.some(
      (c) => c.name.toLowerCase() === nameTrimmed.toLowerCase()
    ) || selectedCourses.some((c) => c.toLowerCase() === nameTrimmed.toLowerCase());

    if (alreadyExists) {
      setCreationError(`La materia "${nameTrimmed}" ya existe en el catálogo o ya está seleccionada.`);
      return;
    }

    if (!isConfirmedPensum) {
      setCreationError("Debes confirmar la casilla de verificación antes de registrar la materia.");
      return;
    }

    // Add and select
    setSelectedCourses([...selectedCourses, nameTrimmed]);
    setCustomCourseName("");
    setCustomCourseCode("");
    setIsConfirmedPensum(false);
    setCurrentStep(2);
  };

  const handleFinishEnrollment = () => {
    if (selectedCourses.length === 0) {
      // Default to minimum if none checked
      const fallback = ["Dibujo en Ingeniería", "Circuitos Eléctricos", "Dinámica y Mecanismos"];
      onSave(fallback);
    } else {
      onSave(selectedCourses);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "640px",
          maxHeight: "92vh",
          background: "#ffffff",
          borderRadius: "24px",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          color: "#0f172a",
          animation: "scaleUpModal 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP CAROUSEL HEADER (PRISTINE WHITE LUXURY) */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontSize: "20px",
                boxShadow: "0 4px 12px rgba(2, 132, 199, 0.3)",
              }}
            >
              🎓
            </div>
            <div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, color: "#0f172a", letterSpacing: "-0.02em" }}>
                Matrícula de Asignaturas UniNova
              </h2>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>
                Paso {currentStep} de 3 · Ingeniería Mecatrónica UNAB
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              color: "#64748b",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: 700,
            }}
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* PROGRESS INDICATOR BAR */}
        <div style={{ display: "flex", width: "100%", height: "4px", background: "#f1f5f9" }}>
          <div
            style={{
              width: currentStep === 1 ? "33%" : currentStep === 2 ? "66%" : "100%",
              background: "linear-gradient(90deg, #0284c7, #38bdf8)",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        {/* CAROUSEL BODY CONTENT */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
          {/* STEP 1: WELCOME & IDENTITY CONFIRMATION */}
          {currentStep === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div
                  style={{
                    display: "inline-block",
                    padding: "4px 14px",
                    borderRadius: "20px",
                    background: "#e0f2fe",
                    color: "#0369a1",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    marginBottom: "12px",
                  }}
                >
                  🚀 Configuración Inicial de Carrera
                </div>
                <h3 style={{ fontSize: "1.45rem", fontWeight: 800, margin: "0 0 8px 0", color: "#0f172a", letterSpacing: "-0.02em" }}>
                  ¡Hola, {studentDisplayName}!
                </h3>
                <p style={{ fontSize: "0.92rem", color: "#475569", margin: 0, lineHeight: 1.55, maxWidth: "480px", marginInline: "auto" }}>
                  Estás ingresando con tu correo institucional <strong style={{ color: "#0284c7" }}>{cleanEmail}</strong>. Selecciona las materias que estás cursando este semestre para activar tu tablero de tareas y parciales.
                </p>
              </div>

              {/* Student Info Card */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b", letterSpacing: "0.5px" }}>
                    Programa Académico
                  </span>
                  <div style={{ fontSize: "0.98rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                    Ingeniería Mecatrónica · UNAB
                  </div>
                </div>
                <div
                  style={{
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    color: "#059669",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: "8px",
                  }}
                >
                  ● Cohorte Activa
                </div>
              </div>

              {/* Step 1 Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  style={{
                    background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "12px",
                    padding: "12px 24px",
                    fontSize: "0.95rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(2, 132, 199, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  Seleccionar Materias →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: COURSE SELECTION WITH ACTIVE PEER COUNTS */}
          {currentStep === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                    Elige tus asignaturas ({selectedCourses.length} seleccionadas)
                  </h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                    Toca sobre cada materia para matricularla o desmatricularla.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  style={{
                    background: "#f0f9ff",
                    border: "1px solid #bae6fd",
                    color: "#0284c7",
                    borderRadius: "10px",
                    padding: "6px 12px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  ✨ + Crear Materia
                </button>
              </div>

              {/* Grid of Courses */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", maxHeight: "380px", overflowY: "auto", paddingRight: "4px" }}>
                {OFFICIAL_UNAB_COURSES.map((course) => {
                  const isSelected = selectedCourses.includes(course.name);
                  const isExpanded = Boolean(expandedCoursePeers[course.id]);
                  const visiblePeers = isExpanded ? course.peers : course.peers.slice(0, 3);
                  const remainingCount = course.peers.length - 3;

                  return (
                    <div
                      key={course.id}
                      onClick={() => toggleCourse(course.name)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "10px",
                        background: isSelected ? "#f8fafc" : "#ffffff",
                        border: isSelected ? "1px solid #0284c7" : "1px solid #f1f5f9",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        transition: "all 0.15s ease",
                        boxShadow: isSelected ? "0 2px 8px rgba(2, 132, 199, 0.08)" : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "16px" }}>{course.icon}</span>
                          <span style={{ fontWeight: 800, fontSize: "0.88rem", color: isSelected ? "#0369a1" : "#0f172a", lineHeight: 1.2 }}>
                            {course.name}
                          </span>
                        </div>
                        <span
                          style={{
                            width: "18px",
                            height: "18px",
                            borderRadius: "4px",
                            border: isSelected ? "1px solid #0284c7" : "1px solid #cbd5e1",
                            background: isSelected ? "#0284c7" : "transparent",
                            display: "grid",
                            placeItems: "center",
                            color: "#ffffff",
                            fontSize: "11px",
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {isSelected && "✓"}
                        </span>
                      </div>

                      <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>
                        Código: {course.code}
                      </div>

                      {/* Real Peer List (3 visible + Ver más dropdown) */}
                      <div
                        style={{
                          marginTop: "4px",
                          paddingTop: "4px",
                          borderTop: "1px solid #f8fafc",
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: "4px",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b" }}>
                          Integrantes:
                        </span>
                        {visiblePeers.map((peer, pIdx) => (
                          <span
                            key={pIdx}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              fontSize: "0.68rem",
                              fontWeight: 600,
                              color: "#0369a1",
                              background: "#f0f9ff",
                              border: "1px solid #e0f2fe",
                              padding: "1px 5px",
                              borderRadius: "4px",
                            }}
                          >
                            <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#0284c7" }} />
                            {peer}
                          </span>
                        ))}

                        {remainingCount > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedCoursePeers((prev) => ({
                                ...prev,
                                [course.id]: !prev[course.id],
                              }));
                            }}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#0284c7",
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              padding: "1px 4px",
                              textDecoration: "underline",
                            }}
                          >
                            {isExpanded ? "▲ Ver menos" : `▼ +${remainingCount} más`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Step 2 Footer Actions */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "14px" }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#64748b",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ← Volver
                </button>
                <button
                  type="button"
                  onClick={handleFinishEnrollment}
                  style={{
                    background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "12px",
                    padding: "12px 24px",
                    fontSize: "0.95rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(2, 132, 199, 0.35)",
                  }}
                >
                  Confirmar y Guardar ({selectedCourses.length}) →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CREATE NEW COURSE WITH STRICT GUARDRAILS & CONFIRMATION */}
          {currentStep === 3 && (
            <form onSubmit={handleCreateCustomCourse} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ textAlign: "center", paddingBottom: "6px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: "#fef3c7",
                    color: "#d97706",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    marginBottom: "8px",
                  }}
                >
                  ⚠️
                </div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: "0 0 6px 0", color: "#0f172a" }}>
                  Crear y Registrar Nueva Asignatura
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                  Verifica que la asignatura no esté en la lista oficial antes de crearla para no duplicar tareas con tus compañeros.
                </p>
              </div>

              {creationError && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                >
                  ⚠️ {creationError}
                </div>
              )}

              {/* Form inputs */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label htmlFor="custom-course-name" style={{ display: "block", fontSize: "0.84rem", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    Nombre oficial de la Asignatura:
                  </label>
                  <input
                    id="custom-course-name"
                    type="text"
                    required
                    placeholder="Ej. Electiva de Visión por Computador, Sensores..."
                    value={customCourseName}
                    onChange={(e) => setCustomCourseName(e.target.value)}
                    style={{
                      width: "100%",
                      height: "44px",
                      padding: "0 12px",
                      borderRadius: "10px",
                      border: "1.5px solid #cbd5e1",
                      background: "#f8fafc",
                      fontSize: "0.92rem",
                      color: "#0f172a",
                      outline: "none",
                    }}
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="custom-course-code" style={{ display: "block", fontSize: "0.84rem", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    Código de la Materia (Opcional):
                  </label>
                  <input
                    id="custom-course-code"
                    type="text"
                    placeholder="Ej. MEC-405"
                    value={customCourseCode}
                    onChange={(e) => setCustomCourseCode(e.target.value)}
                    style={{
                      width: "100%",
                      height: "44px",
                      padding: "0 12px",
                      borderRadius: "10px",
                      border: "1.5px solid #cbd5e1",
                      background: "#f8fafc",
                      fontSize: "0.92rem",
                      color: "#0f172a",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Strict Verification Checkbox */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1.5px dashed #cbd5e1",
                  borderRadius: "12px",
                  padding: "14px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                }}
              >
                <input
                  id="confirm-pensum-check"
                  type="checkbox"
                  checked={isConfirmedPensum}
                  onChange={(e) => setIsConfirmedPensum(e.target.checked)}
                  style={{ width: "18px", height: "18px", marginTop: "2px", cursor: "pointer" }}
                />
                <label htmlFor="confirm-pensum-check" style={{ fontSize: "0.82rem", color: "#334155", lineHeight: 1.45, cursor: "pointer", fontWeight: 600 }}>
                  Confirmo bajo mi responsabilidad que esta asignatura pertenece al pensum oficial de la UNAB y no se encuentra repetida en el catálogo.
                </label>
              </div>

              {/* Step 3 Actions */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#64748b",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ← Cancelar y Volver
                </button>
                <button
                  type="submit"
                  disabled={!isConfirmedPensum || !customCourseName.trim()}
                  style={{
                    background: isConfirmedPensum && customCourseName.trim()
                      ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                      : "#94a3b8",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "12px",
                    padding: "12px 20px",
                    fontSize: "0.92rem",
                    fontWeight: 800,
                    cursor: isConfirmedPensum && customCourseName.trim() ? "pointer" : "not-allowed",
                    boxShadow: isConfirmedPensum ? "0 4px 14px rgba(16, 185, 129, 0.35)" : "none",
                  }}
                >
                  ✅ Sí, Crear y Matricular Asignatura
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
