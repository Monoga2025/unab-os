"use client";

import React, { useState, useEffect } from "react";
import { getTaskKindBadge, type KanbanCard, type TaskHistoryEntry } from "./uninova-dashboard-view";

export interface TaskComment {
  id: string;
  authorName: string;
  authorEmail?: string;
  authorRole: "Estudiante" | "Docente" | "Monitor";
  avatarBg: string;
  timestamp: string;
  text: string;
}

export interface UniNovaTaskDrawerProps {
  card: KanbanCard | null;
  onClose: () => void;
  onToggleComplete?: (id: string) => void;
  onUpdateTask?: (updatedCard: KanbanCard, historyEntry?: TaskHistoryEntry) => void;
  onSaveNotes?: (id: string, notes: string, weighting?: string) => void;
  onDelete?: (id: string) => void;
  currentUserName?: string;
  currentUserEmail?: string;
}

const DEFAULT_TASK_COMMENTS: Record<string, TaskComment[]> = {
  "kb-mie-entrega-botella-dibujo": [
    {
      id: "c-1",
      authorName: "Daniel Monoga",
      authorEmail: "user6@example.edu",
      authorRole: "Estudiante",
      avatarBg: "#3b82f6",
      timestamp: "Hoy · 11:50 AM",
      text: "Ya tengo listo el croquis 3D de la botella en SolidWorks con el relieve y cotas requeridas.",
    },
  ],
  "kb-mar-portafolio-circuitos": [
    {
      id: "c-5",
      authorName: "Daniel Monoga",
      authorEmail: "user6@example.edu",
      authorRole: "Estudiante",
      avatarBg: "#06b6d4",
      timestamp: "Hoy · 10:15 AM",
      text: "Ya tengo la solución de Thevenin y Norton verificada. Los subo en PDF al canal.",
    },
  ],
};

function getProfessorForSubject(subjectName: string): string {
  const s = subjectName.toLowerCase();
  if (s.includes("circuito")) return "Ing. Ricardo Duarte";
  if (s.includes("dinámica") || s.includes("mecanismo")) return "Ing. Hernán Ospina";
  if (s.includes("material")) return "Dra. Martha Cecilia Jaimes";
  if (s.includes("cálculo") || s.includes("edo")) return "Lic. Roberto Flórez";
  if (s.includes("física") || s.includes("onda")) return "Dr. Carlos Vecino";
  if (s.includes("estadística")) return "Mg. Andrea Suárez";
  if (s.includes("dibujo") || s.includes("cad")) return "Ing. Felipe Mendoza";
  return "Docente Titular UNAB";
}

export function UniNovaTaskDrawer({
  card,
  onClose,
  onToggleComplete,
  onUpdateTask,
  onSaveNotes,
  onDelete,
  currentUserName = "Daniel Monoga",
  currentUserEmail = "user6@example.edu",
}: UniNovaTaskDrawerProps) {
  const [activeTab, setActiveTab] = useState<"notion" | "chat" | "history">("notion");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [selectedDayKey, setSelectedDayKey] = useState<KanbanCard["dayKey"]>("lunes");
  const [selectedTimeText, setSelectedTimeText] = useState<string>("11:59 PM");
  const [weightPercent, setWeightPercent] = useState<string>("15%");
  const [notes, setNotes] = useState<string>("");
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [aiFeedbackMessage, setAiFeedbackMessage] = useState<string | null>(null);

  // Pomodoro timer state
  const [pomodoroSeconds, setPomodoroSeconds] = useState<number>(45 * 60);
  const [isPomodoroActive, setIsPomodoroActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPomodoroActive && pomodoroSeconds > 0) {
      interval = setInterval(() => {
        setPomodoroSeconds((prev) => prev - 1);
      }, 1000);
    } else if (pomodoroSeconds === 0 && isPomodoroActive) {
      setIsPomodoroActive(false);
      setAiFeedbackMessage("🎉 ¡Bloque Pomodoro de 45m completado! Tómate 5m de descanso.");
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPomodoroActive, pomodoroSeconds]);

  useEffect(() => {
    if (!card) return;
    setEditedTitle(card.title);
    setSelectedDayKey(card.dayKey || "lunes");
    setSelectedTimeText(card.timeText || "11:59 PM");
    setNotes(card.notes || "");
    setWeightPercent(card.weighting || "15%");
    setAiFeedbackMessage(null);
    setIsPomodoroActive(false);
    setPomodoroSeconds(45 * 60);

    // Load comments
    try {
      const storageKey = `uninova_task_comments_v2_${card.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setComments(JSON.parse(saved) as TaskComment[]);
      } else if (DEFAULT_TASK_COMMENTS[card.id]) {
        setComments(DEFAULT_TASK_COMMENTS[card.id]);
      } else {
        setComments([
          {
            id: `init-${Date.now()}`,
            authorName: "Monitor Académico",
            authorRole: "Monitor",
            avatarBg: "#0284c7",
            timestamp: "Hoy 8:00 AM",
            text: "Canal colaborativo abierto. Pueden compartir dudas, soluciones y cambios de fecha aquí.",
          },
        ]);
      }
    } catch {
      // ignore
    }
  }, [card]);

  if (!card) return null;

  const handleSaveTitle = () => {
    const trimmed = editedTitle.trim();
    if (!trimmed || trimmed === card.title) {
      setIsEditingTitle(false);
      return;
    }

    const historyEntry: TaskHistoryEntry = {
      id: `hist-${Date.now()}`,
      timestamp: new Date().toISOString(),
      authorName: currentUserName,
      authorEmail: currentUserEmail,
      action: "renamed",
      detail: `${currentUserName} cambió el nombre a "${trimmed}"`,
    };

    const updatedCard: KanbanCard = {
      ...card,
      title: trimmed,
      lastModifiedBy: currentUserName,
      lastModifiedAt: new Date().toISOString(),
      history: [historyEntry, ...(card.history || [])],
    };

    setIsEditingTitle(false);
    if (onUpdateTask) {
      onUpdateTask(updatedCard, historyEntry);
    }
  };

  const handleDayChange = (newDay: KanbanCard["dayKey"]) => {
    setSelectedDayKey(newDay);
    const dayNames: Record<string, string> = {
      lunes: "Lunes",
      martes: "Martes",
      miercoles: "Miércoles",
      jueves: "Jueves",
      viernes: "Viernes",
      finde: "Fin de Semana",
    };
    const dayLabel = dayNames[newDay] || newDay;
    const historyEntry: TaskHistoryEntry = {
      id: `hist-${Date.now()}`,
      timestamp: new Date().toISOString(),
      authorName: currentUserName,
      authorEmail: currentUserEmail,
      action: "moved",
      detail: `${currentUserName} cambió el día de entrega a ${dayLabel}`,
    };

    const updatedCard: KanbanCard = {
      ...card,
      dayKey: newDay,
      lastModifiedBy: currentUserName,
      lastModifiedAt: new Date().toISOString(),
      history: [historyEntry, ...(card.history || [])],
    };

    if (onUpdateTask) {
      onUpdateTask(updatedCard, historyEntry);
    }
  };

  const handleTimeBlur = () => {
    const trimmedTime = selectedTimeText.trim() || "11:59 PM";
    if (trimmedTime === (card.timeText || "11:59 PM")) return;

    const historyEntry: TaskHistoryEntry = {
      id: `hist-${Date.now()}`,
      timestamp: new Date().toISOString(),
      authorName: currentUserName,
      authorEmail: currentUserEmail,
      action: "notes_updated",
      detail: `${currentUserName} cambió la hora límite a ${trimmedTime}`,
    };

    const updatedCard: KanbanCard = {
      ...card,
      timeText: trimmedTime,
      lastModifiedBy: currentUserName,
      lastModifiedAt: new Date().toISOString(),
      history: [historyEntry, ...(card.history || [])],
    };

    if (onUpdateTask) {
      onUpdateTask(updatedCard, historyEntry);
    }
  };

  const handleWeightBlur = () => {
    const trimmedWeight = weightPercent.trim() || "15%";
    if (trimmedWeight === (card.weighting || "15%")) return;

    const historyEntry: TaskHistoryEntry = {
      id: `hist-${Date.now()}`,
      timestamp: new Date().toISOString(),
      authorName: currentUserName,
      authorEmail: currentUserEmail,
      action: "weighting_changed",
      detail: `${currentUserName} actualizó la ponderación a ${trimmedWeight}`,
    };

    const updatedCard: KanbanCard = {
      ...card,
      weighting: trimmedWeight,
      lastModifiedBy: currentUserName,
      lastModifiedAt: new Date().toISOString(),
      history: [historyEntry, ...(card.history || [])],
    };

    if (onUpdateTask) {
      onUpdateTask(updatedCard, historyEntry);
    }
    if (onSaveNotes) {
      onSaveNotes(card.id, notes, trimmedWeight);
    }
  };

  const handleSaveNotesBlur = () => {
    if (notes.trim() === (card.notes || "").trim()) return;

    const historyEntry: TaskHistoryEntry = {
      id: `hist-${Date.now()}`,
      timestamp: new Date().toISOString(),
      authorName: currentUserName,
      authorEmail: currentUserEmail,
      action: "notes_updated",
      detail: `${currentUserName} actualizó las notas e instrucciones`,
    };

    const updatedCard: KanbanCard = {
      ...card,
      notes: notes.trim() || undefined,
      lastModifiedBy: currentUserName,
      lastModifiedAt: new Date().toISOString(),
      history: [historyEntry, ...(card.history || [])],
    };

    if (onUpdateTask) {
      onUpdateTask(updatedCard, historyEntry);
    }
    if (onSaveNotes) {
      onSaveNotes(card.id, notes.trim(), weightPercent);
    }
  };

  // Jarvis AI Action 1: Desglosar con IA
  const handleJarvisBreakdown = () => {
    const breakdown = `\n\n📌 **Pasos sugeridos por Jarvis AI:**\n- [ ] 1. Revisar rúbrica oficial y conceptos teóricos de ${card.subject}.\n- [ ] 2. Plantear ecuaciones canónicas y resolver cálculos analíticos.\n- [ ] 3. Modelar o simular (SolidWorks / Proteus / MATLAB) para verificar.\n- [ ] 4. Redactar reporte en formato IEEE y exportar a PDF para entrega.`;
    const newNotes = (notes ? notes.trim() + breakdown : breakdown.trim());
    setNotes(newNotes);
    setAiFeedbackMessage("✨ Pasos desglosados e insertados en las notas con éxito.");

    if (onSaveNotes) {
      onSaveNotes(card.id, newNotes, weightPercent);
    }
    if (onUpdateTask) {
      onUpdateTask({ ...card, notes: newNotes });
    }
  };

  // Jarvis AI Action 2: Fórmulas Clave
  const handleJarvisFormulas = () => {
    const s = card.subject.toLowerCase();
    let formulaBlock = "";

    if (s.includes("dinámica") || s.includes("mecanismo")) {
      formulaBlock = `\n\n📐 **Fórmulas Clave - Dinámica & Mecanismos:**\n- Grashof: $S + L \\le P + Q$ (para giro continuo)\n- Criterio de Grübler: $M = 3(n - 1) - 2j_1 - j_2$\n- Ley de Coriolus: $a_c = 2\\omega \\times v_{rel}$`;
    } else if (s.includes("circuito")) {
      formulaBlock = `\n\n📐 **Fórmulas Clave - Circuitos Eléctricos:**\n- Leyes de Kirchhoff: $\\sum I_{nodo} = 0, \\sum V_{malla} = 0$\n- Thévenin: $V_{th} = V_{oc}, R_{th} = \\frac{V_{oc}}{I_{sc}}$\n- Potencia Máxima: $R_L = R_{th} \\implies P_{max} = \\frac{V_{th}^2}{4R_{th}}$`;
    } else if (s.includes("cálculo") || s.includes("edo")) {
      formulaBlock = `\n\n📐 **Fórmulas Clave - EDO & Cálculo:**\n- EDO Bernoulli: $y' + P(x)y = Q(x)y^n \\xrightarrow{u = y^{1-n}} u' + (1-n)Pu = (1-n)Q$\n- Factor Integrante: $\\mu(x) = \\exp\\left(\\int P(x)dx\\right)$\n- Gradiente: $\\nabla f = \\left(\\frac{\\partial f}{\\partial x}, \\frac{\\partial f}{\\partial y}\\right)$`;
    } else if (s.includes("material")) {
      formulaBlock = `\n\n📐 **Fórmulas Clave - Ciencia de Materiales:**\n- Esfuerzo Normal: $\\sigma = \\frac{P}{A}$\n- Esfuerzo por Flexión: $\\sigma_{max} = \\frac{M \\cdot c}{I}$\n- Ley de Hooke: $\\sigma = E \\cdot \\epsilon$`;
    } else if (s.includes("física") || s.includes("onda")) {
      formulaBlock = `\n\n📐 **Fórmulas Clave - Física Ondas:**\n- Velocidad de onda: $v = \\lambda f = \\frac{\\omega}{k}$\n- Energía del fotón: $E = h f = \\frac{h c}{\\lambda}$`;
    } else {
      formulaBlock = `\n\n📐 **Fórmulas Clave - Ingeniería UNAB:**\n- Rendimiento / Eficiencia: $\\eta = \\frac{P_{salida}}{P_{entrada}} \\times 100\\%$\n- Error relativo: $\\epsilon_r = \\left|\\frac{x_{teorico} - x_{exp}}{x_{teorico}}\\right| \\times 100\\%$`;
    }

    const newNotes = (notes ? notes.trim() + formulaBlock : formulaBlock.trim());
    setNotes(newNotes);
    setAiFeedbackMessage("📐 Fórmulas canónicas insertadas en las notas.");

    if (onSaveNotes) {
      onSaveNotes(card.id, newNotes, weightPercent);
    }
    if (onUpdateTask) {
      onUpdateTask({ ...card, notes: newNotes });
    }
  };

  // Format Pomodoro seconds
  const formatPomodoro = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSendComment = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = newCommentText.trim();
    if (!text) return;

    const newComment: TaskComment = {
      id: `comm-${Date.now()}`,
      authorName: currentUserName,
      authorEmail: currentUserEmail,
      authorRole: "Estudiante",
      avatarBg: "#10b981",
      timestamp: new Intl.DateTimeFormat("es-CO", {
        timeZone: "America/Bogota",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date()),
      text,
    };

    const updated = [...comments, newComment];
    setComments(updated);
    setNewCommentText("");

    try {
      localStorage.setItem(`uninova_task_comments_v2_${card.id}`, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const isCompleted = Boolean(card.completed);
  const professorName = card.professor || getProfessorForSubject(card.subject);
  const kindBadge = getTaskKindBadge(card);

  return (
    <div className="uninova-notion-side-peek-backdrop" onClick={onClose}>
      <aside
        className="uninova-notion-side-peek-panel"
        onClick={(e) => e.stopPropagation()}
        aria-label="Detalle de tarea tipo Notion"
      >
        {/* TOP NOTION HEADER */}
        <div className="uninova-drawer-header" style={{ borderBottom: "1px solid var(--notion-hairline, #e6e6e6)" }}>
          <div className="uninova-drawer-header-left">
            <span className={`uninova-notion-tag ${card.subjectColor || "blue"}`}>
              📚 {card.subject}
            </span>
            <span
              className="uninova-task-kind-badge"
              style={{
                backgroundColor: kindBadge.bg,
                color: kindBadge.color,
                border: `1px solid ${kindBadge.border}`,
                fontSize: "0.74rem",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "6px",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              {kindBadge.label}
            </span>
            <button
              type="button"
              onClick={() => onToggleComplete && onToggleComplete(card.id)}
              className={`uninova-status-badge ${isCompleted ? "completed" : "pending"}`}
              style={{
                fontSize: "0.76rem",
                padding: "3px 10px",
                borderRadius: "6px",
                fontWeight: 700,
                cursor: "pointer",
                border: "none",
                background: isCompleted ? "rgba(26, 174, 57, 0.12)" : "rgba(221, 91, 0, 0.12)",
                color: isCompleted ? "var(--notion-sticker-green, #1aae39)" : "var(--notion-sticker-orange, #dd5b00)",
              }}
              title="Haz clic para alternar estado"
            >
              {isCompleted ? "✅ Completada" : "⏳ Pendiente"}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(card.id)}
                className="uninova-delete-card-btn"
                style={{ fontSize: "0.78rem", padding: "4px 8px" }}
                title="Eliminar tarea"
              >
                🗑️
              </button>
            )}
            <button
              type="button"
              className="uninova-drawer-close-btn"
              onClick={onClose}
              aria-label="Cerrar panel lateral Notion"
            >
              ✕
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="uninova-drawer-body" style={{ background: "var(--notion-canvas, #ffffff)" }}>
          {/* TITLE & EDIT BUTTON */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
            {isEditingTitle ? (
              <div style={{ display: "flex", width: "100%", gap: "8px" }}>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="uninova-auth-input"
                  style={{
                    padding: "8px 12px",
                    fontSize: "1.15rem",
                    fontWeight: 800,
                    letterSpacing: "-0.625px",
                    border: "1px solid var(--notion-primary, #0075de)",
                  }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") setIsEditingTitle(false);
                  }}
                />
                <button
                  type="button"
                  className="uninova-btn-primary"
                  onClick={handleSaveTitle}
                  style={{ padding: "0 14px", height: "42px" }}
                >
                  Guardar
                </button>
              </div>
            ) : (
              <h2
                className={`uninova-drawer-title ${isCompleted ? "line-through opacity-70" : ""}`}
                onClick={() => setIsEditingTitle(true)}
                title="Haz clic para editar el título"
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "1.3rem",
                  fontWeight: 800,
                  letterSpacing: "-0.625px",
                  color: "var(--notion-ink, #000000)",
                }}
              >
                <span>{card.title}</span>
                <span style={{ fontSize: "0.8rem", opacity: 0.5 }}>✏️</span>
              </h2>
            )}
          </div>

          {/* NOTION PROPERTIES VERTICAL TABLE */}
          <div className="uninova-notion-properties-grid">
            <div className="uninova-notion-prop-label">📌 Estado</div>
            <div className="uninova-notion-prop-value">
              <select
                value={isCompleted ? "completed" : "pending"}
                onChange={() => onToggleComplete && onToggleComplete(card.id)}
                className="uninova-notion-prop-input"
                style={{ maxWidth: "160px" }}
              >
                <option value="pending">⏳ Pendiente</option>
                <option value="completed">✅ Completada</option>
              </select>
            </div>

            <div className="uninova-notion-prop-label">📚 Asignatura</div>
            <div className="uninova-notion-prop-value">
              <span className={`uninova-notion-tag ${card.subjectColor || "blue"}`} style={{ fontSize: "0.8rem" }}>
                {card.subject}
              </span>
            </div>

            <div className="uninova-notion-prop-label">📅 Día de Entrega</div>
            <div className="uninova-notion-prop-value">
              <select
                value={selectedDayKey}
                onChange={(e) => handleDayChange(e.target.value as KanbanCard["dayKey"])}
                className="uninova-notion-prop-input"
                style={{ maxWidth: "160px" }}
              >
                <option value="lunes">Lunes</option>
                <option value="martes">Martes</option>
                <option value="miercoles">Miércoles</option>
                <option value="jueves">Jueves</option>
                <option value="viernes">Viernes</option>
                <option value="finde">Fin de Semana</option>
              </select>
            </div>

            <div className="uninova-notion-prop-label">⏰ Hora Límite</div>
            <div className="uninova-notion-prop-value">
              <input
                type="text"
                value={selectedTimeText}
                onChange={(e) => setSelectedTimeText(e.target.value)}
                onBlur={handleTimeBlur}
                onKeyDown={(e) => { if (e.key === "Enter") handleTimeBlur(); }}
                className="uninova-notion-prop-input"
                placeholder="11:59 PM"
                style={{ maxWidth: "160px" }}
              />
            </div>

            <div className="uninova-notion-prop-label">📊 Ponderación</div>
            <div className="uninova-notion-prop-value">
              <input
                type="text"
                value={weightPercent}
                onChange={(e) => setWeightPercent(e.target.value)}
                onBlur={handleWeightBlur}
                onKeyDown={(e) => { if (e.key === "Enter") handleWeightBlur(); }}
                list="drawer-weight-suggestions-list"
                className="uninova-notion-prop-input"
                placeholder="15% Portafolio"
                style={{ maxWidth: "160px" }}
              />
              <datalist id="drawer-weight-suggestions-list">
                <option value="10% Quiz" />
                <option value="15% Portafolio" />
                <option value="15% Proyecto CAD" />
                <option value="20% Laboratorio" />
                <option value="25% Parcial 1" />
                <option value="30% Parcial 1" />
                <option value="40% Examen Final" />
              </datalist>
            </div>

            <div className="uninova-notion-prop-label">👨‍🏫 Docente</div>
            <div className="uninova-notion-prop-value">
              <span style={{ fontSize: "0.82rem", color: "var(--notion-ink-secondary, #31302e)", fontWeight: 600 }}>
                {professorName}
              </span>
            </div>

            <div className="uninova-notion-prop-label">👤 Integrante</div>
            <div className="uninova-notion-prop-value">
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "var(--notion-canvas-soft, #f6f5f4)", padding: "2px 8px", borderRadius: "12px", border: "1px solid var(--notion-hairline, #e6e6e6)" }}>
                <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: "var(--notion-primary, #0075de)", color: "#fff", fontSize: "9px", display: "grid", placeItems: "center", fontWeight: 700 }}>
                  {currentUserName.charAt(0).toUpperCase()}
                </span>
                <span style={{ fontSize: "0.78rem", fontWeight: 600 }}>{currentUserName}</span>
              </div>
            </div>
          </div>

          {/* JARVIS AI COPILOT TOOLBAR */}
          <div className="uninova-jarvis-drawer-toolbar">
            <div className="uninova-jarvis-toolbar-header">
              <span>🤖 Jarvis Copilot AI</span>
              {isPomodoroActive && (
                <span style={{ color: "#dc2626", fontWeight: 800, animation: "pulse 1s infinite" }}>
                  ⏱️ Pomodoro: {formatPomodoro(pomodoroSeconds)}
                </span>
              )}
            </div>

            <div className="uninova-jarvis-tools-row">
              <button
                type="button"
                className="uninova-jarvis-tool-btn"
                onClick={handleJarvisBreakdown}
                title="Generar checklist de pasos sugeridos con IA"
              >
                ✨ Desglosar con IA
              </button>
              <button
                type="button"
                className="uninova-jarvis-tool-btn"
                onClick={handleJarvisFormulas}
                title="Insertar fórmulas canónicas según la materia"
              >
                📐 Fórmulas Clave
              </button>
              <button
                type="button"
                className="uninova-jarvis-tool-btn"
                onClick={() => {
                  if (isPomodoroActive) {
                    setIsPomodoroActive(false);
                    setAiFeedbackMessage("⏱️ Sesión Pomodoro en pausa.");
                  } else {
                    setIsPomodoroActive(true);
                    setAiFeedbackMessage("⏱️ Pomodoro de 45m iniciado. ¡Enfócate en esta entrega!");
                  }
                }}
                title="Activar sesión de estudio Pomodoro de 45 minutos"
              >
                {isPomodoroActive ? "⏸️ Pausar 45m" : "⏱️ Pomodoro 45m"}
              </button>
            </div>

            {aiFeedbackMessage && (
              <div style={{ fontSize: "0.78rem", color: "var(--notion-primary, #0075de)", marginTop: "4px", fontWeight: 600 }}>
                {aiFeedbackMessage}
              </div>
            )}
          </div>

          {/* TABS: NOTION NOTES vs DISCORD CHAT vs HISTORIAL */}
          <div style={{ display: "flex", gap: "6px", borderBottom: "1px solid var(--notion-hairline, #e6e6e6)", paddingBottom: "8px", marginTop: "4px" }}>
            <button
              type="button"
              className={`uninova-notion-tab-btn ${activeTab === "notion" ? "active" : ""}`}
              onClick={() => setActiveTab("notion")}
            >
              📝 Bloque de Notas
            </button>
            <button
              type="button"
              className={`uninova-notion-tab-btn ${activeTab === "chat" ? "active" : ""}`}
              onClick={() => setActiveTab("chat")}
            >
              💬 #discusion ({comments.length})
            </button>
            <button
              type="button"
              className={`uninova-notion-tab-btn ${activeTab === "history" ? "active" : ""}`}
              onClick={() => setActiveTab("history")}
            >
              📜 Historial ({(card.history || []).length})
            </button>
          </div>

          {/* 1. NOTION BLOCK NOTES EDITOR */}
          {activeTab === "notion" && (
            <div className="uninova-notion-block-editor">
              <label htmlFor="drawer-notes-notion" style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--notion-ink-muted, #615d59)" }}>
                Editor de Notas & Instrucciones (Formato Markdown y ecuaciones soportado):
              </label>
              <textarea
                id="drawer-notes-notion"
                rows={7}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleSaveNotesBlur}
                placeholder="Escribe notas, checklists, acuerdos de equipo o pega fórmulas canónicas..."
                className="uninova-notion-editor-textarea"
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <small style={{ color: "var(--notion-ink-faint, #a39e98)", fontSize: "0.72rem" }}>
                  💡 Los cambios se guardan automáticamente al desenfocar el editor.
                </small>
                <button
                  type="button"
                  className="uninova-btn-secondary"
                  onClick={handleSaveNotesBlur}
                  style={{ fontSize: "0.74rem", padding: "4px 10px" }}
                >
                  Guardar Notas
                </button>
              </div>
            </div>
          )}

          {/* 2. CHAT TAB */}
          {activeTab === "chat" && (
            <div className="uninova-discord-section">
              <div className="uninova-discord-header">
                <div className="uninova-discord-channel-info">
                  <span className="discord-hash">#</span>
                  <strong>discusion-entrega</strong>
                  <span className="discord-live-pill">En Vivo</span>
                </div>
                <small className="discord-sub">Grupo Mecatrónica UNAB</small>
              </div>

              {/* Message Feed */}
              <div className="uninova-discord-messages-feed">
                {comments.map((comm) => (
                  <div key={comm.id} className="uninova-discord-message">
                    <div
                      className="uninova-discord-avatar"
                      style={{ backgroundColor: comm.avatarBg }}
                    >
                      {comm.authorName.charAt(0).toUpperCase()}
                    </div>
                    <div className="uninova-discord-content">
                      <div className="uninova-discord-msg-meta">
                        <span className="discord-author">{comm.authorName}</span>
                        <span className={`discord-role-badge ${comm.authorRole.toLowerCase()}`}>
                          {comm.authorRole}
                        </span>
                        <time className="discord-timestamp">{comm.timestamp}</time>
                      </div>
                      <p className="discord-text">{comm.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Chips */}
              <div className="uninova-discord-chips">
                <button
                  type="button"
                  className="discord-chip-btn"
                  onClick={() => setNewCommentText("¿Alguien tiene el PDF de los ejercicios?")}
                >
                  ❓ PDF Ejercicios
                </button>
                <button
                  type="button"
                  className="discord-chip-btn"
                  onClick={() => setNewCommentText("Acabo de verificar con el profe y la entrega es el martes.")}
                >
                  ⏰ Confirmado
                </button>
                <button
                  type="button"
                  className="discord-chip-btn"
                  onClick={() => setNewCommentText("Ya completé la simulación y cuadran los resultados ✅")}
                >
                  ✅ Verificado
                </button>
              </div>

              {/* Composer */}
              <form onSubmit={handleSendComment} className="uninova-discord-composer">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder={`Escribe como ${currentUserName}...`}
                  className="uninova-discord-input"
                />
                <button
                  type="submit"
                  className="uninova-discord-send-btn"
                  disabled={!newCommentText.trim()}
                  aria-label="Enviar mensaje"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </form>
            </div>
          )}

          {/* 3. HISTORY AUDIT TAB */}
          {activeTab === "history" && (
            <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {(card.history && card.history.length > 0) ? (
                card.history.map((hist) => (
                  <div
                    key={hist.id}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "10px",
                      background: "var(--notion-canvas-soft, #f6f5f4)",
                      border: "1px solid var(--notion-hairline, #e6e6e6)",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: "linear-gradient(135deg, #0284c7, #0369a1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "0.85rem",
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      {hist.authorName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--notion-ink, #000000)" }}>
                          {hist.authorName}
                        </span>
                        <time style={{ fontSize: "0.76rem", color: "var(--notion-ink-muted, #615d59)" }}>
                          {new Intl.DateTimeFormat("es-CO", {
                            timeZone: "America/Bogota",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(hist.timestamp))}
                        </time>
                      </div>
                      <p style={{ margin: "3px 0 0 0", fontSize: "0.84rem", color: "var(--notion-ink-secondary, #31302e)", lineHeight: 1.4 }}>
                        {hist.detail}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--notion-ink-muted, #615d59)", fontSize: "0.88rem" }}>
                  Aún no hay registros de modificación en esta tarea.
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
