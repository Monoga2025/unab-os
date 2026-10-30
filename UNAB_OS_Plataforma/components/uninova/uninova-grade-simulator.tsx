"use client";

import React, { useState, useEffect } from "react";

export interface SubjectGrades {
  id: string;
  name: string;
  code: string;
  credits: number;
  corte1: number;
  corte2: number;
  // Desglose opcional de sub-evaluaciones
  c1Exam?: number;
  c1Work?: number;
  c2Exam?: number;
  c2Work?: number;
}

export const INITIAL_SUBJECTS: SubjectGrades[] = [
  { id: "calc", name: "Cálculo Multivariable & EDO", code: "MAT-201", credits: 4, corte1: 3.2, corte2: 2.8, c1Exam: 3.0, c1Work: 3.4, c2Exam: 2.5, c2Work: 3.1 },
  { id: "circ", name: "Circuitos Eléctricos", code: "MEC-204", credits: 4, corte1: 3.8, corte2: 3.5, c1Exam: 3.6, c1Work: 4.0, c2Exam: 3.4, c2Work: 3.6 },
  { id: "din", name: "Dinámica y Mecanismos", code: "MEC-301", credits: 3, corte1: 4.0, corte2: 3.7, c1Exam: 4.2, c1Work: 3.8, c2Exam: 3.5, c2Work: 3.9 },
  { id: "fis", name: "Física: Ondas y Partículas", code: "FIS-202", credits: 3, corte1: 2.6, corte2: 3.0, c1Exam: 2.4, c1Work: 2.8, c2Exam: 3.0, c2Work: 3.0 },
  { id: "alg", name: "Álgebra Lineal Aplicada", code: "MAT-105", credits: 3, corte1: 4.2, corte2: 4.5, c1Exam: 4.0, c1Work: 4.4, c2Exam: 4.6, c2Work: 4.4 },
  { id: "hum", name: "Identidad & Ética UNAB", code: "HUM-101", credits: 2, corte1: 4.6, corte2: 4.8, c1Exam: 4.5, c1Work: 4.7, c2Exam: 4.8, c2Work: 4.8 },
];

const STORAGE_KEY = "uninova_unab_grade_simulator_v2";

export function calculateNeededGrade(target: number, c1: number, c2: number): number {
  const accumulated = c1 * 0.3 + c2 * 0.3;
  return Number(((target - accumulated) / 0.4).toFixed(2));
}

export function calculateSemesterPga(subjects: SubjectGrades[], projectedC3 = 3.5): number {
  let totalWeighted = 0;
  let totalCredits = 0;
  for (const s of subjects) {
    const finalProjected = s.corte1 * 0.3 + s.corte2 * 0.3 + projectedC3 * 0.4;
    totalWeighted += finalProjected * s.credits;
    totalCredits += s.credits;
  }
  return totalCredits > 0 ? Number((totalWeighted / totalCredits).toFixed(2)) : 0;
}

export function UniNovaGradeSimulator() {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("calc");
  const [subjects, setSubjects] = useState<SubjectGrades[]>(INITIAL_SUBJECTS);
  const [targetGrade, setTargetGrade] = useState<number>(3.0);
  const [useDetailedMode, setUseDetailedMode] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Hidratación desde localStorage segura en cliente
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSubjects(parsed);
        }
      }
    } catch {
      // Usar defaults si hay error en parsing
    }
  }, []);

  // Persistir en localStorage al cambiar notas
  const persistSubjects = (updated: SubjectGrades[]) => {
    setSubjects(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignorar errores de storage
    }
  };

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];

  const updateDirectGrade = (field: "corte1" | "corte2", val: number) => {
    const clamped = Math.max(0, Math.min(5.0, Number(val.toFixed(1))));
    const updated = subjects.map((s) => (s.id === currentSubject.id ? { ...s, [field]: clamped } : s));
    persistSubjects(updated);
  };

  const updateSubGrade = (field: "c1Exam" | "c1Work" | "c2Exam" | "c2Work", val: number) => {
    const clamped = Math.max(0, Math.min(5.0, Number(val.toFixed(1))));
    const updated = subjects.map((s) => {
      if (s.id !== currentSubject.id) return s;
      const next = { ...s, [field]: clamped };
      // 50% parcial + 50% talleres dentro de cada corte
      const c1Exam = field === "c1Exam" ? clamped : (s.c1Exam ?? s.corte1);
      const c1Work = field === "c1Work" ? clamped : (s.c1Work ?? s.corte1);
      const c2Exam = field === "c2Exam" ? clamped : (s.c2Exam ?? s.corte2);
      const c2Work = field === "c2Work" ? clamped : (s.c2Work ?? s.corte2);

      next.corte1 = Number(((c1Exam + c1Work) / 2).toFixed(1));
      next.corte2 = Number(((c2Exam + c2Work) / 2).toFixed(1));
      return next;
    });
    persistSubjects(updated);
  };

  const resetToDefaults = () => {
    persistSubjects(INITIAL_SUBJECTS);
  };

  // Cálculos de supervivencia UNAB
  const accumulated = Number((currentSubject.corte1 * 0.3 + currentSubject.corte2 * 0.3).toFixed(2));
  const neededInCorte3 = calculateNeededGrade(targetGrade, currentSubject.corte1, currentSubject.corte2);

  const neededFor30 = calculateNeededGrade(3.0, currentSubject.corte1, currentSubject.corte2);
  const neededFor40 = calculateNeededGrade(4.0, currentSubject.corte1, currentSubject.corte2);
  const neededFor42 = calculateNeededGrade(4.2, currentSubject.corte1, currentSubject.corte2);

  // PGA general del semestre
  const projectedSemesterPga = calculateSemesterPga(subjects, 3.5);

  const getStatus = () => {
    if (neededInCorte3 <= 0) {
      return {
        label: "¡MATERIA ASEGURADA!",
        desc: "Ya alcanzaste la meta acumulada. Aunque saques 0.0 en el Corte 3, tienes la materia aprobada.",
        color: "#16a34a",
        bg: "#dcfce7",
        border: "#86efac",
        badge: "Segura",
      };
    }
    if (neededInCorte3 <= 3.5) {
      return {
        label: "ZONA SEGURA Y ALCANZABLE",
        desc: `Con un examen promedio de ${neededInCorte3} pasas la asignatura sin sobresaltos.`,
        color: "#0284c7",
        bg: "#e0f2fe",
        border: "#7dd3fc",
        badge: "Alcanzable",
      };
    }
    if (neededInCorte3 <= 5.0) {
      return {
        label: "ZONA DE ALERTA MODERADA",
        desc: `Exige esfuerzo alto. Necesitas ${neededInCorte3} en el examen del 40% para alcanzar tu meta.`,
        color: "#d97706",
        bg: "#fef3c7",
        border: "#fcd34d",
        badge: "Esfuerzo Alto",
      };
    }
    return {
      label: "ALERTA ROJA CRÍTICA",
      desc: `Matemáticamente requieres ${neededInCorte3} (superior a 5.0). Necesitas ajustar tu meta o hablar con el docente para puntos extra.`,
      color: "#dc2626",
      bg: "#fee2e2",
      border: "#fca5a5",
      badge: "Crítica",
    };
  };

  const status = getStatus();

  const handleCopySummary = async () => {
    const text = `📊 *Supervivencia Académica UNAB*\nMateria: ${currentSubject.name}\nAcumulado (C1 30% + C2 30%): ${accumulated.toFixed(2)}/3.00\nNecesito en Corte 3 (40%) para pasar en 3.0: ${neededFor30 <= 0 ? "0.0 (Ya pasé)" : neededFor30 > 5 ? "Imposible (>5.0)" : neededFor30}\nMeta personal (${targetGrade}): ${neededInCorte3 <= 0 ? "0.0 (Asegurada)" : neededInCorte3 > 5 ? "> 5.0" : neededInCorte3}\nEstado: ${status.label}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedNotification("¡Resumen copiado al portapapeles!");
      setTimeout(() => setCopiedNotification(null), 3000);
    } catch {
      setCopiedNotification("Copia manual: " + text.slice(0, 50) + "...");
    }
  };

  return (
    <div
      className="uninova-grade-simulator-root"
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "20px",
        border: "1px solid var(--color-border)",
        padding: "28px",
        boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
      }}
    >
      {/* Top Banner: Global Semester PGA and Survival Matrix */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "12px 18px",
          marginBottom: "22px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              backgroundColor: "#0284c7",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "1rem",
            }}
          >
            ∑
          </div>
          <div>
            <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              PGA Proyectado del Semestre (Ponderado por Créditos)
            </div>
            <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#0f172a" }}>
              {projectedSemesterPga.toFixed(2)}{" "}
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: projectedSemesterPga >= 4.0 ? "#16a34a" : "#d97706" }}>
                ({projectedSemesterPga >= 4.2 ? "Califica Beca UNAB" : projectedSemesterPga >= 3.8 ? "Rango Óptimo" : "En Zona de Riesgo"})
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setUseDetailedMode(!useDetailedMode)}
            style={{
              padding: "6px 12px",
              fontSize: "0.78rem",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              backgroundColor: useDetailedMode ? "#0284c7" : "#ffffff",
              color: useDetailedMode ? "#ffffff" : "#334155",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {useDetailedMode ? "Modo Simple (Cortes)" : "Desglosar Quices/Parciales"}
          </button>
          <button
            type="button"
            onClick={resetToDefaults}
            style={{
              padding: "6px 12px",
              fontSize: "0.78rem",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
              color: "#64748b",
              fontWeight: 600,
              cursor: "pointer",
            }}
            title="Restaurar notas de ejemplo predeterminadas"
          >
            Restablecer
          </button>
        </div>
      </div>

      {/* Header & Subject Selector */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px", marginBottom: "20px" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.76rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.8px", color: "#0284c7", marginBottom: "4px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#0284c7" }} />
            Algoritmo Oficial UNAB (Corte 1: 30% · Corte 2: 30% · Corte 3: 40%)
          </div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--color-text)", margin: 0 }}>
            Calculadora de Supervivencia & Notas de Corte
          </h2>
          <p style={{ fontSize: "0.86rem", color: "var(--color-text-secondary)", margin: "4px 0 0 0" }}>
            Selecciona una materia y ajusta tus notas para ver exactamente qué necesitas en el examen final del 40%.
          </p>
        </div>

        {/* Subject Pills */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {subjects.map((sub) => {
            const isSelected = selectedSubjectId === sub.id;
            const subNeeded = calculateNeededGrade(3.0, sub.corte1, sub.corte2);
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSubjectId(sub.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  fontSize: "0.8rem",
                  borderRadius: "10px",
                  fontWeight: isSelected ? 800 : 500,
                  backgroundColor: isSelected ? "#0f172a" : "#f1f5f9",
                  color: isSelected ? "#ffffff" : "#475569",
                  border: isSelected ? "1.5px solid #0f172a" : "1px solid #e2e8f0",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{sub.name.split(" ")[0]}</span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    padding: "1px 5px",
                    borderRadius: "6px",
                    backgroundColor: isSelected ? "rgba(255,255,255,0.2)" : subNeeded <= 0 ? "#dcfce7" : subNeeded > 5 ? "#fee2e2" : "#e0f2fe",
                    color: isSelected ? "#ffffff" : subNeeded <= 0 ? "#16a34a" : subNeeded > 5 ? "#dc2626" : "#0284c7",
                    fontWeight: 700,
                  }}
                >
                  {subNeeded <= 0 ? "✓" : subNeeded > 5 ? "!" : subNeeded.toFixed(1)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Inputs vs Results */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
        {/* Left Column: Grade Inputs */}
        <div style={{ backgroundColor: "#f8fafc", padding: "22px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
          <div style={{ marginBottom: "18px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
            <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Materia en Edición</span>
            <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>{currentSubject.name}</div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", display: "flex", gap: "10px", marginTop: "2px" }}>
              <span>Código: {currentSubject.code}</span>
              <span>•</span>
              <span>{currentSubject.credits} Créditos Académicos</span>
            </div>
          </div>

          {!useDetailedMode ? (
            /* Modo Directo: 2 Sliders de Corte */
            <>
              {/* Corte 1 Input */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>
                    Corte 1 (Ponderación: 30%)
                  </label>
                  <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0284c7" }}>
                    {currentSubject.corte1.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="5.0"
                  step="0.1"
                  value={currentSubject.corte1}
                  onChange={(e) => updateDirectGrade("corte1", parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "#0284c7" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#94a3b8" }}>
                  <span>0.0</span>
                  <span>Aporta al acumulado: {(currentSubject.corte1 * 0.3).toFixed(2)} pts</span>
                  <span>5.0</span>
                </div>
              </div>

              {/* Corte 2 Input */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>
                    Corte 2 (Ponderación: 30%)
                  </label>
                  <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0284c7" }}>
                    {currentSubject.corte2.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="5.0"
                  step="0.1"
                  value={currentSubject.corte2}
                  onChange={(e) => updateDirectGrade("corte2", parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "#0284c7" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#94a3b8" }}>
                  <span>0.0</span>
                  <span>Aporta al acumulado: {(currentSubject.corte2 * 0.3).toFixed(2)} pts</span>
                  <span>5.0</span>
                </div>
              </div>
            </>
          ) : (
            /* Modo Detallado: Parcial + Quices por cada corte */
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "16px" }}>
              <div style={{ backgroundColor: "#ffffff", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a", marginBottom: "8px" }}>
                  Corte 1 (30%) → Parcial (15%) + Quices (15%)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "0.74rem", color: "#64748b" }}>Parcial: {(currentSubject.c1Exam ?? currentSubject.corte1).toFixed(1)}</label>
                    <input
                      type="range"
                      min="0.0"
                      max="5.0"
                      step="0.1"
                      value={currentSubject.c1Exam ?? currentSubject.corte1}
                      onChange={(e) => updateSubGrade("c1Exam", parseFloat(e.target.value))}
                      style={{ width: "100%", accentColor: "#0284c7" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.74rem", color: "#64748b" }}>Quices/Talleres: {(currentSubject.c1Work ?? currentSubject.corte1).toFixed(1)}</label>
                    <input
                      type="range"
                      min="0.0"
                      max="5.0"
                      step="0.1"
                      value={currentSubject.c1Work ?? currentSubject.corte1}
                      onChange={(e) => updateSubGrade("c1Work", parseFloat(e.target.value))}
                      style={{ width: "100%", accentColor: "#0284c7" }}
                    />
                  </div>
                </div>
                <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#0284c7", marginTop: "4px" }}>
                  Nota consolidada Corte 1: {currentSubject.corte1.toFixed(1)}
                </div>
              </div>

              <div style={{ backgroundColor: "#ffffff", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a", marginBottom: "8px" }}>
                  Corte 2 (30%) → Parcial (15%) + Laboratorio (15%)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "0.74rem", color: "#64748b" }}>Parcial: {(currentSubject.c2Exam ?? currentSubject.corte2).toFixed(1)}</label>
                    <input
                      type="range"
                      min="0.0"
                      max="5.0"
                      step="0.1"
                      value={currentSubject.c2Exam ?? currentSubject.corte2}
                      onChange={(e) => updateSubGrade("c2Exam", parseFloat(e.target.value))}
                      style={{ width: "100%", accentColor: "#0284c7" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.74rem", color: "#64748b" }}>Laboratorio: {(currentSubject.c2Work ?? currentSubject.corte2).toFixed(1)}</label>
                    <input
                      type="range"
                      min="0.0"
                      max="5.0"
                      step="0.1"
                      value={currentSubject.c2Work ?? currentSubject.corte2}
                      onChange={(e) => updateSubGrade("c2Work", parseFloat(e.target.value))}
                      style={{ width: "100%", accentColor: "#0284c7" }}
                    />
                  </div>
                </div>
                <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#0284c7", marginTop: "4px" }}>
                  Nota consolidada Corte 2: {currentSubject.corte2.toFixed(1)}
                </div>
              </div>
            </div>
          )}

          {/* Meta Selector */}
          <div>
            <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b", display: "block", marginBottom: "8px" }}>
              Meta Deseada para {currentSubject.name.split(" ")[0]}:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                { label: "Pasar Raspando (3.0)", val: 3.0 },
                { label: "Promedio Bueno (4.0)", val: 4.0 },
                { label: "Mantener Beca (4.2)", val: 4.2 },
                { label: "Matrícula Honor (4.7)", val: 4.7 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setTargetGrade(opt.val)}
                  style={{
                    padding: "8px 10px",
                    fontSize: "0.78rem",
                    fontWeight: targetGrade === opt.val ? 800 : 500,
                    borderRadius: "8px",
                    border: targetGrade === opt.val ? "2px solid #0284c7" : "1px solid #cbd5e1",
                    backgroundColor: targetGrade === opt.val ? "#e0f2fe" : "#ffffff",
                    color: targetGrade === opt.val ? "#0369a1" : "#334155",
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Mathematical Verdict & Survival Card */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Main Verdict Banner */}
          <div
            style={{
              backgroundColor: status.bg,
              border: `1.5px solid ${status.border}`,
              borderRadius: "16px",
              padding: "22px",
              textAlign: "center",
              position: "relative",
            }}
          >
            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: status.color, textTransform: "uppercase", letterSpacing: "1px" }}>
              {status.label}
            </span>
            <div style={{ fontSize: "3.2rem", fontWeight: 900, color: status.color, lineHeight: 1.1, margin: "8px 0" }}>
              {neededInCorte3 <= 0 ? "0.0" : neededInCorte3 > 5.0 ? "> 5.0" : neededInCorte3.toFixed(2)}
            </div>
            <p style={{ fontSize: "0.92rem", fontWeight: 700, color: "#1e293b", margin: "0 0 6px 0" }}>
              Nota que necesitas en el Corte 3 (Examen Final 40%)
            </p>
            <p style={{ fontSize: "0.82rem", color: "#475569", margin: 0, lineHeight: 1.4 }}>
              {status.desc}
            </p>

            <div style={{ marginTop: "14px" }}>
              <button
                type="button"
                onClick={handleCopySummary}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                  border: "1px solid rgba(0,0,0,0.12)",
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                }}
              >
                <span>📋 Copiar Veredicto para Compartir</span>
              </button>
              {copiedNotification && (
                <div style={{ fontSize: "0.74rem", color: "#16a34a", fontWeight: 700, marginTop: "6px" }}>
                  {copiedNotification}
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Survival Table */}
          <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "16px" }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "10px" }}>
              Desglose de Metas para {currentSubject.name.split(" ")[0]}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f1f5f9", fontSize: "0.86rem" }}>
              <span style={{ color: "#64748b" }}>Acumulado actual (C1 + C2):</span>
              <strong style={{ color: "#0f172a" }}>{accumulated.toFixed(2)} / 3.00 pts</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f1f5f9", fontSize: "0.86rem" }}>
              <span style={{ color: "#64748b" }}>Para pasar en 3.00 necesitas:</span>
              <strong style={{ color: neededFor30 <= 0 ? "#16a34a" : neededFor30 > 5 ? "#dc2626" : "#0284c7" }}>
                {neededFor30 <= 0 ? "0.0 (Aprobado)" : neededFor30 > 5 ? "Imposible (>5.0)" : neededFor30.toFixed(2)}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f1f5f9", fontSize: "0.86rem" }}>
              <span style={{ color: "#64748b" }}>Para promedio 4.00 necesitas:</span>
              <strong style={{ color: neededFor40 <= 0 ? "#16a34a" : neededFor40 > 5 ? "#dc2626" : "#0284c7" }}>
                {neededFor40 <= 0 ? "0.0 (Alcanzado)" : neededFor40 > 5 ? "> 5.0" : neededFor40.toFixed(2)}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: "0.86rem" }}>
              <span style={{ color: "#64748b" }}>Para beca de honor (4.20) necesitas:</span>
              <strong style={{ color: neededFor42 <= 0 ? "#16a34a" : neededFor42 > 5 ? "#dc2626" : "#0284c7" }}>
                {neededFor42 <= 0 ? "0.0 (Alcanzado)" : neededFor42 > 5 ? "> 5.0" : neededFor42.toFixed(2)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Semester Matrix Overview Table */}
      <div style={{ marginTop: "24px", borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", marginBottom: "12px" }}>
          Matriz de Supervivencia Semestral (Todas tus asignaturas)
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1.5px solid #e2e8f0", color: "#64748b" }}>
                <th style={{ padding: "10px" }}>Asignatura</th>
                <th style={{ padding: "10px" }}>Créditos</th>
                <th style={{ padding: "10px" }}>Corte 1 (30%)</th>
                <th style={{ padding: "10px" }}>Corte 2 (30%)</th>
                <th style={{ padding: "10px" }}>Acumulado</th>
                <th style={{ padding: "10px" }}>Para Pasar (3.0)</th>
                <th style={{ padding: "10px" }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((sub) => {
                const subAcc = Number((sub.corte1 * 0.3 + sub.corte2 * 0.3).toFixed(2));
                const needed = calculateNeededGrade(3.0, sub.corte1, sub.corte2);
                const isSelected = sub.id === selectedSubjectId;

                return (
                  <tr
                    key={sub.id}
                    onClick={() => setSelectedSubjectId(sub.id)}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      backgroundColor: isSelected ? "rgba(2, 132, 199, 0.05)" : "transparent",
                      cursor: "pointer",
                      fontWeight: isSelected ? 700 : 400,
                    }}
                  >
                    <td style={{ padding: "10px", color: "#0f172a" }}>
                      <strong>{sub.name}</strong> <span style={{ color: "#94a3b8", fontSize: "0.74rem" }}>({sub.code})</span>
                    </td>
                    <td style={{ padding: "10px", color: "#475569" }}>{sub.credits}</td>
                    <td style={{ padding: "10px", color: "#0f172a" }}>{sub.corte1.toFixed(1)}</td>
                    <td style={{ padding: "10px", color: "#0f172a" }}>{sub.corte2.toFixed(1)}</td>
                    <td style={{ padding: "10px", color: "#0f172a" }}>{subAcc.toFixed(2)} pts</td>
                    <td style={{ padding: "10px" }}>
                      <strong style={{ color: needed <= 0 ? "#16a34a" : needed > 5 ? "#dc2626" : "#0284c7" }}>
                        {needed <= 0 ? "0.0 (Asegurada)" : needed > 5 ? "Crítico (>5.0)" : needed.toFixed(2)}
                      </strong>
                    </td>
                    <td style={{ padding: "10px" }}>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: "12px",
                          backgroundColor: needed <= 0 ? "#dcfce7" : needed <= 3.5 ? "#e0f2fe" : needed <= 5.0 ? "#fef3c7" : "#fee2e2",
                          color: needed <= 0 ? "#16a34a" : needed <= 3.5 ? "#0284c7" : needed <= 5.0 ? "#d97706" : "#dc2626",
                        }}
                      >
                        {needed <= 0 ? "Asegurada" : needed <= 3.5 ? "Alcanzable" : needed <= 5.0 ? "Alerta" : "Crítica"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
