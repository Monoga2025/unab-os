"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { UniNovaGradeSimulator } from "./uninova-grade-simulator";
import { UniNovaWeeklySchedule } from "./uninova-weekly-schedule";
import { UniNovaTaskDrawer } from "./uninova-task-drawer";
import { UniNovaEnrollmentModal } from "./uninova-enrollment-modal";
import { JarvisHudOrb } from "@/components/jarvis-hud-orb";
import { TelegramPairingCard, type TelegramPairingStatus } from "@/components/telegram-pairing-card";
import type { AcademicAgendaEntry } from "@/lib/domain/academic-collaboration";

export interface UniNovaDashboardProps {
  userName?: string;
  userEmail?: string;
  userRole?: string;
  enrolledCount?: number;
  evaluationsCount?: number;
  temaFilesCount?: number;
  studyHours?: number;
  telegramStatus?: TelegramPairingStatus;
  agendaEvents?: Array<{
    id: string;
    timeRange: string;
    title: string;
    location: string;
    colorVar: string;
  }>;
  rawAgenda?: AcademicAgendaEntry[];
  enrolledCourses?: string[];
}

export interface ProfessorItem {
  id: string;
  name: string;
  code: string;
  subject: string;
  campus: string;
  schedule: string;
  email: string;
  phone: string;
  statusLabel: string;
  avatarFallback: string;
}

const UNAB_PROFESSORS: ProfessorItem[] = [
  {
    id: "duarte",
    name: "Ing. Ricardo Duarte",
    code: "DOC-CIR-01",
    subject: "Circuitos Eléctricos",
    campus: "Campus El Jardín · Bloque D Aula 204",
    schedule: "Mar y Jue · 8:00 AM a 10:00 AM",
    email: "user3@example.edu",
    phone: "+57 607 643 6111 Ext. 210",
    statusLabel: "Docente Titular",
    avatarFallback: "RD",
  },
  {
    id: "ospina",
    name: "Ing. Hernán Ospina",
    code: "DOC-MEC-02",
    subject: "Dinámica y Mecanismos",
    campus: "Campus El Jardín · Lab Mecatrónica D-102",
    schedule: "Lun y Mié · 10:00 AM a 12:00 PM",
    email: "user4@example.edu",
    phone: "+57 607 643 6111 Ext. 215",
    statusLabel: "Docente Asociado",
    avatarFallback: "HO",
  },
  {
    id: "jaimes",
    name: "Dra. Martha Cecilia Jaimes",
    code: "DOC-MAT-03",
    subject: "Ciencia de Materiales",
    campus: "Campus El Jardín · Aula 302",
    schedule: "Mié y Vie · 1:00 PM a 4:00 PM",
    email: "user5@example.edu",
    phone: "+57 607 643 6111 Ext. 305",
    statusLabel: "Docente Principal",
    avatarFallback: "MJ",
  },
];

export interface TaskHistoryEntry {
  id: string;
  timestamp: string;
  authorName: string;
  authorEmail?: string;
  action: "created" | "renamed" | "status_changed" | "weighting_changed" | "notes_updated" | "deleted" | "moved";
  detail: string;
}

export interface KanbanCard {
  id: string;
  dayKey: "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "finde";
  type: "class" | "task" | "tema_unconfirmed";
  title: string;
  subject: string;
  subjectColor: "blue" | "green" | "purple" | "rose" | "orange";
  timeText: string;
  location?: string;
  professor?: string;
  priority?: "Alta" | "Media" | "Normal";
  taskKind?: "Parcial" | "Taller" | "Quiz" | "Laboratorio" | "Proyecto" | "Portafolio" | "Entrega";
  completed?: boolean;
  notes?: string;
  weighting?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
  history?: TaskHistoryEntry[];
}

export function getTaskKindBadge(card: KanbanCard): { label: string; bg: string; color: string; border: string } {
  const titleLower = card.title.toLowerCase();
  const kind = card.taskKind || (
    titleLower.includes("parcial") ? "Parcial"
    : titleLower.includes("quiz") ? "Quiz"
    : titleLower.includes("lab") || titleLower.includes("laboratorio") ? "Laboratorio"
    : titleLower.includes("proyecto") || titleLower.includes("cad") || titleLower.includes("botella") || titleLower.includes("rosca") || titleLower.includes("solidworks") ? "Proyecto"
    : titleLower.includes("portafolio") ? "Portafolio"
    : titleLower.includes("taller") || titleLower.includes("ejercicios") ? "Taller"
    : "Entrega"
  );

  switch (kind) {
    case "Parcial":
      return { label: "🎯 Parcial", bg: "#ffe4e6", color: "#e11d48", border: "#fecdd3" };
    case "Quiz":
      return { label: "⚡ Quiz", bg: "#fef3c7", color: "#d97706", border: "#fde68a" };
    case "Laboratorio":
      return { label: "🔬 Laboratorio", bg: "#f3e8ff", color: "#9333ea", border: "#e9d5ff" };
    case "Proyecto":
      return { label: "📐 Proyecto CAD", bg: "#dcfce7", color: "#16a34a", border: "#bbf7d0" };
    case "Portafolio":
      return { label: "📖 Portafolio", bg: "#e0e7ff", color: "#4f46e5", border: "#c7d2fe" };
    case "Taller":
      return { label: "📝 Taller", bg: "#e0f2fe", color: "#0284c7", border: "#bae6fd" };
    default:
      return { label: "📌 Entrega", bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" };
  }
}

export const KANBAN_DAYS = [
  { key: "lunes", label: "Lunes", dateStr: "15 Sep" },
  { key: "martes", label: "Martes", dateStr: "16 Sep" },
  { key: "miercoles", label: "Miércoles", dateStr: "17 Sep" },
  { key: "jueves", label: "Jueves", dateStr: "18 Sep" },
  { key: "viernes", label: "Viernes", dateStr: "19 Sep" },
  { key: "finde", label: "Fin de Semana", dateStr: "20-21 Sep" },
] as const;

export function getColombiaNow() {
  const now = new Date();
  const timeZone = "America/Bogota";

  const weekdayEn = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(now).toLowerCase();
  
  let todayKey: "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "finde" = "lunes";
  if (weekdayEn.startsWith("mon")) todayKey = "lunes";
  else if (weekdayEn.startsWith("tue")) todayKey = "martes";
  else if (weekdayEn.startsWith("wed")) todayKey = "miercoles";
  else if (weekdayEn.startsWith("thu")) todayKey = "jueves";
  else if (weekdayEn.startsWith("fri")) todayKey = "viernes";
  else if (weekdayEn.startsWith("sat") || weekdayEn.startsWith("sun")) todayKey = "finde";

  const fullDate = new Intl.DateTimeFormat("es-CO", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  const timeStr = new Intl.DateTimeFormat("es-CO", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(now);

  const dayNumber = parseInt(
    new Intl.DateTimeFormat("en-US", { timeZone, day: "numeric" }).format(now),
    10
  );

  return {
    todayKey,
    fullDate,
    timeStr,
    dayNumber,
    rawIso: now.toISOString(),
  };
}

export interface CalendarEventItem {
  id: string;
  day: number;
  title: string;
  location: string;
  timeRange: string;
  colorType: string;
  source: "regular" | "tema";
  confirmed?: boolean;
}

export const INITIAL_CALENDAR_EVENTS: CalendarEventItem[] = [
  { id: "cal-21", day: 21, title: "Parcial 1: Cálculo Multivariable & EDO", location: "Bloque L · Aula 204", timeRange: "8:00 AM - 10:00 AM", colorType: "blue", source: "regular", confirmed: true },
  { id: "cal-22-parcial-cir", day: 22, title: "Parcial 1: Circuitos Eléctricos", location: "Bloque D · Aula D12", timeRange: "6:00 AM - 8:00 AM", colorType: "blue", source: "regular", confirmed: true },
  { id: "cal-22-parcial-est", day: 22, title: "Parcial 1: Estadística Inferencial", location: "Bloque L · Aula 301", timeRange: "10:00 AM - 12:00 PM", colorType: "rose", source: "regular", confirmed: true },
  { id: "cal-22-portafolio", day: 22, title: "Entrega Portafolio Circuitos (25 ejercicios)", location: "TEMA Moodle", timeRange: "11:59 PM", colorType: "blue", source: "regular", confirmed: true },
  { id: "cal-22-vencido-est", day: 22, title: "Subir Proyecto de Estadística Inferencial (Vencido)", location: "TEMA Moodle", timeRange: "11:59 PM", colorType: "purple", source: "tema", confirmed: false },
  { id: "cal-23-ondas", day: 23, title: "Parcial 1: Física: Ondas y Partículas", location: "Bloque D · Aula 102", timeRange: "8:00 AM - 10:00 AM", colorType: "rose", source: "regular", confirmed: true },
  { id: "cal-23-cad", day: 23, title: "Entrega CAD: Garrafa y Botella con Relieve", location: "TEMA Moodle / Lab CAD", timeRange: "11:59 PM", colorType: "purple", source: "regular", confirmed: true },
  { id: "cal-24-mat", day: 24, title: "Quiz: Ciencia de Materiales & Flexión", location: "Bloque D · Aula 302", timeRange: "2:00 PM - 4:00 PM", colorType: "purple", source: "regular", confirmed: true },
  { id: "cal-25", day: 25, title: "Parcial 1: Dinámica y Mecanismos (4 Barras / Grashof)", location: "Bloque L · Aula 204", timeRange: "10:00 AM - 12:00 PM", colorType: "green", source: "regular", confirmed: true },
];

export const INITIAL_KANBAN_CARDS: KanbanCard[] = [
  // LUNES 21
  {
    id: "kb-lun-parcial-calculo",
    dayKey: "lunes",
    type: "task",
    title: "Parcial 1: Cálculo Multivariable & EDO",
    subject: "Cálculo Multivariable & EDO",
    subjectColor: "blue",
    timeText: "8:00 AM",
    priority: "Alta",
    completed: false,
    weighting: "30% Parcial 1",
    notes: "Parcial presencial. Temas: EDO Bernoulli, ecuaciones exactas e integrales dobles.",
    history: [
      {
        id: "h-calc-1",
        timestamp: "2026-09-20T08:00:00.000Z",
        authorName: "Daniel Monoga",
        authorEmail: "user6@example.edu",
        action: "created",
        detail: "Daniel Monoga registró la fecha oficial del Parcial 1 de Cálculo",
      },
    ],
  },

  // MARTES 22
  {
    id: "kb-mar-parcial-circuitos",
    dayKey: "martes",
    type: "task",
    title: "Parcial 1: Circuitos Eléctricos",
    subject: "Circuitos Eléctricos",
    subjectColor: "blue",
    timeText: "6:00 AM",
    priority: "Alta",
    completed: false,
    weighting: "30% Parcial 1",
    notes: "Parcial presencial a primera hora (6:00 a. m.) con el Ing. Duarte en Bloque D Aula 204.",
    history: [
      {
        id: "h-cir-1",
        timestamp: "2026-09-20T08:15:00.000Z",
        authorName: "Daniel Monoga",
        authorEmail: "user6@example.edu",
        action: "created",
        detail: "Daniel Monoga creó el evento de Parcial de Circuitos",
      },
    ],
  },
  {
    id: "kb-mar-portafolio-circuitos",
    dayKey: "martes",
    type: "task",
    title: "Entrega del Portafolio de Circuitos (25 ejercicios)",
    subject: "Circuitos Eléctricos",
    subjectColor: "blue",
    timeText: "11:59 PM",
    priority: "Alta",
    completed: false,
    weighting: "15% Portafolio",
    notes: "Entrega completa de los 25 ejercicios del portafolio en PDF con desarrollo paso a paso.",
    history: [
      {
        id: "h-port-1",
        timestamp: "2026-09-20T08:30:00.000Z",
        authorName: "Daniel Monoga",
        authorEmail: "user6@example.edu",
        action: "created",
        detail: "Daniel Monoga añadió la entrega del portafolio de 25 ejercicios",
      },
    ],
  },
  {
    id: "kb-mar-parcial-estadistica",
    dayKey: "martes",
    type: "task",
    title: "Parcial 1: Estadística Inferencial",
    subject: "Estadística Inferencial",
    subjectColor: "rose",
    timeText: "10:00 AM",
    priority: "Alta",
    completed: false,
    weighting: "25% Parcial 1",
    notes: "Parcial presencial y evaluación en plataforma sobre muestreo e intervalos de confianza.",
    history: [
      {
        id: "h-est-1",
        timestamp: "2026-09-20T08:45:00.000Z",
        authorName: "Daniel Monoga",
        authorEmail: "user6@example.edu",
        action: "created",
        detail: "Daniel Monoga registró la fecha del parcial de Estadística Inferencial",
      },
    ],
  },
  {
    id: "kb-mar-proyecto-estadistica",
    dayKey: "martes",
    type: "task",
    title: "Subir Proyecto de Estadística Inferencial",
    subject: "Estadística Inferencial",
    subjectColor: "purple",
    timeText: "11:59 PM",
    priority: "Media",
    completed: false,
    weighting: "15% Proyecto",
    notes: "Subir informe final del avance de muestreo a la plataforma.",
    history: [
      {
        id: "h-proy-1",
        timestamp: "2026-09-20T09:00:00.000Z",
        authorName: "Daniel Monoga",
        authorEmail: "user6@example.edu",
        action: "created",
        detail: "Daniel Monoga registró la entrega del proyecto",
      },
    ],
  },

  // MIÉRCOLES 23
  {
    id: "kb-mie-parcial-ondas",
    dayKey: "miercoles",
    type: "task",
    title: "Parcial 1: Física: Ondas y Partículas (MAS)",
    subject: "Física: Ondas",
    subjectColor: "rose",
    timeText: "8:00 AM",
    priority: "Alta",
    completed: false,
    weighting: "30% Parcial 1",
    notes: "Parcial teórico-práctico de Movimiento Armónico Simple y ondas mecánicas.",
    history: [
      {
        id: "h-ond-1",
        timestamp: "2026-09-20T09:15:00.000Z",
        authorName: "Daniel Monoga",
        authorEmail: "user6@example.edu",
        action: "created",
        detail: "Daniel Monoga añadió el parcial de Ondas",
      },
    ],
  },
  {
    id: "kb-mie-entrega-botella-dibujo",
    dayKey: "miercoles",
    type: "task",
    title: "Entrega CAD: Garrafa y Botella con Relieve (SolidWorks)",
    subject: "Dibujo en Ingeniería",
    subjectColor: "purple",
    timeText: "11:59 PM",
    priority: "Alta",
    completed: false,
    weighting: "15% Proyecto CAD",
    notes: "Modelado 3D en SolidWorks con cosido de superficies, redondeos y croquis de relieve.",
    history: [
      {
        id: "h-cad-1",
        timestamp: "2026-09-20T09:30:00.000Z",
        authorName: "Daniel Monoga",
        authorEmail: "user6@example.edu",
        action: "created",
        detail: "Daniel Monoga registró la entrega del ensamble CAD de la botella y garrafa",
      },
    ],
  },

  // JUEVES 24
  {
    id: "kb-jue-quiz-materiales",
    dayKey: "jueves",
    type: "task",
    title: "Quiz / Taller: Ciencia de Materiales & Resistencia (Flexión de Vigas)",
    subject: "Ciencia de Materiales",
    subjectColor: "green",
    timeText: "2:00 PM",
    priority: "Alta",
    completed: false,
    weighting: "10% Quiz",
    notes: "Quiz presencial sobre flexión pura, cálculo de momentos de inercia y esfuerzos normales.",
    history: [
      {
        id: "h-mat-1",
        timestamp: "2026-09-20T09:45:00.000Z",
        authorName: "Daniel Monoga",
        authorEmail: "user6@example.edu",
        action: "created",
        detail: "Daniel Monoga añadió el quiz de flexión de materiales",
      },
    ],
  },

  // VIERNES 25
  {
    id: "kb-vie-parcial-mecanismos",
    dayKey: "viernes",
    type: "task",
    title: "Parcial 1: Dinámica y Mecanismos (4 Barras / Grashof)",
    subject: "Dinámica y Mecanismos",
    subjectColor: "green",
    timeText: "10:00 AM",
    priority: "Alta",
    completed: false,
    weighting: "30% Parcial 1",
    notes: "Parcial de Dinámica y Mecanismos sobre 4 barras, inversión cinemática y criterios de Grashof.",
    history: [
      {
        id: "h-mec-1",
        timestamp: "2026-09-20T10:00:00.000Z",
        authorName: "Daniel Monoga",
        authorEmail: "user6@example.edu",
        action: "created",
        detail: "Daniel Monoga confirmó la fecha oficial del parcial de mecanismos",
      },
    ],
  },
  {
    id: "kb-vie-quiz-rosca-dibujo",
    dayKey: "viernes",
    type: "task",
    title: "Quiz CAD: Modelado de Rosca y Engranaje (Dibujo en Ingeniería)",
    subject: "Dibujo en Ingeniería",
    subjectColor: "purple",
    timeText: "6:00 PM",
    priority: "Media",
    completed: false,
    weighting: "10% Quiz",
    notes: "Modelado 3D cronometrado de perfil helicoidal de rosca y dientes de engranaje.",
    history: [
      {
        id: "h-rosc-1",
        timestamp: "2026-09-20T10:15:00.000Z",
        authorName: "Daniel Monoga",
        authorEmail: "user6@example.edu",
        action: "created",
        detail: "Daniel Monoga añadió el quiz de rosca y engranaje",
      },
    ],
  },
];

export function UniNovaDashboardView({
  userName = "Estudiante",
  userEmail,
  userRole = "Estudiante UNAB",
  enrolledCount = 0,
  evaluationsCount = 0,
  temaFilesCount = 0,
  studyHours = 0,
  telegramStatus,
  agendaEvents,
  rawAgenda,
  enrolledCourses,
}: UniNovaDashboardProps) {
  const isDanielMonoga = Boolean(
    (userEmail && userEmail.toLowerCase().includes("dmonoga")) ||
    (typeof window !== "undefined" && window.localStorage?.getItem("uninova_user_email")?.toLowerCase().includes("dmonoga"))
  );

  const defaultDanielCourses = [
    "Dinámica y Mecanismos",
    "Circuitos Eléctricos",
    "Cálculo Multivariable & EDO",
    "Ciencia de Materiales",
    "Física: Ondas",
    "Estadística Inferencial",
    "Dibujo en Ingeniería",
  ];

  // User Enrolled Courses state isolated per user
  const [userEnrolledCourses, setUserEnrolledCourses] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const email = userEmail || localStorage.getItem("uninova_user_email") || "guest";
        const saved = localStorage.getItem(`uninova_enrolled_courses_${email.toLowerCase().trim()}`);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    if (enrolledCourses && enrolledCourses.length > 0) return enrolledCourses;
    if (isDanielMonoga) return defaultDanielCourses;
    return [];
  });

  const availableSubjects = userEnrolledCourses.length > 0
    ? userEnrolledCourses
    : (enrolledCourses && enrolledCourses.length > 0
        ? enrolledCourses
        : (isDanielMonoga ? defaultDanielCourses : []));

  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [selectedDrawerCard, setSelectedDrawerCard] = useState<KanbanCard | null>(null);

  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "resumen";
  const [activeTab, setActiveTab] = useState<string>(currentTab);
  const [currentUserName, setCurrentUserName] = useState(userName);

  // Colombia Time & Date state (America/Bogota)
  const [colombiaNow, setColombiaNow] = useState(getColombiaNow());

  useEffect(() => {
    try {
      const isLoggedOut = localStorage.getItem("uninova_logged_out") === "1";
      if (isLoggedOut) {
        setCurrentUserName("Estudiante");
      } else {
        const savedEmail = userEmail || localStorage.getItem("uninova_user_email");
        if (savedEmail) {
          if (savedEmail.toLowerCase().includes("dmonoga")) {
            setCurrentUserName("Daniel");
          } else {
            const prefix = savedEmail.split("@")[0] || "Estudiante";
            const formatted = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
            setCurrentUserName(formatted);
          }

          // Load user courses from localStorage
          const savedCourses = localStorage.getItem(`uninova_enrolled_courses_${savedEmail.toLowerCase().trim()}`);
          if (savedCourses) {
            setUserEnrolledCourses(JSON.parse(savedCourses));
          }
        }
      }
    } catch {
      // ignore
    }
  }, [userName, userEmail]);

  useEffect(() => {
    setColombiaNow(getColombiaNow());
    const timer = setInterval(() => {
      setColombiaNow(getColombiaNow());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Jarvis assistant state
  const [jarvisPrompt, setJarvisPrompt] = useState("");
  const [jarvisResponse, setJarvisResponse] = useState<string | null>(null);
  const [isJarvisThinking, setIsJarvisThinking] = useState(false);
  const [showJarvisVideo, setShowJarvisVideo] = useState(true);

  const SHARED_KANBAN_KEY = "uninova_shared_collaborative_tasks_v2";

  const getStorageKey = () => SHARED_KANBAN_KEY;

  const getDefaultCards = (): KanbanCard[] => {
    if (availableSubjects.length === 0 && !isDanielMonoga) {
      return [];
    }
    return INITIAL_KANBAN_CARDS;
  };

  // Notion Kanban & Database View State
  const [kanbanCards, setKanbanCards] = useState<KanbanCard[]>([]);
  const [databaseViewMode, setDatabaseViewMode] = useState<"kanban" | "table" | "calendar" | "list">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");
  const [selectedViewType, setSelectedViewType] = useState<"all" | "tasks" | "tema">("all");

  // Show enrollment modal on first login if no subjects are chosen
  useEffect(() => {
    try {
      const email = userEmail || localStorage.getItem("uninova_user_email");
      const isLoggedOut = localStorage.getItem("uninova_logged_out") === "1";
      const hasEnrolled = localStorage.getItem(`uninova_enrollment_done_${(email || "guest").toLowerCase().trim()}`);

      if (email && !isLoggedOut && !hasEnrolled && userEnrolledCourses.length === 0 && !isDanielMonoga) {
        setShowEnrollmentModal(true);
      }
    } catch {
      // ignore
    }
  }, [userEmail, userEnrolledCourses.length, isDanielMonoga]);

  // New Task Modal State
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskDay, setNewTaskDay] = useState<"lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "finde">("martes");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskSubject, setNewTaskSubject] = useState("General");
  const [newTaskKind, setNewTaskKind] = useState<"Parcial" | "Taller" | "Quiz" | "Laboratorio" | "Proyecto" | "Portafolio" | "Entrega">("Taller");
  const [newTaskTime, setNewTaskTime] = useState("11:59 PM");
  const [newTaskPriority, setNewTaskPriority] = useState<"Alta" | "Media" | "Normal">("Alta");
  const [newTaskNotes, setNewTaskNotes] = useState("");

  // Load saved shared collaborative Kanban state from localStorage on mount
  useEffect(() => {
    try {
      const key = getStorageKey();
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as KanbanCard[];
        if (availableSubjects.length === 0 && !isDanielMonoga) {
          setKanbanCards([]);
        } else {
          setKanbanCards(parsed);
        }
      } else {
        setKanbanCards(getDefaultCards());
        localStorage.setItem(key, JSON.stringify(getDefaultCards()));
      }
    } catch {
      setKanbanCards(getDefaultCards());
    }
  }, [availableSubjects.length, isDanielMonoga]);

  const saveKanbanCards = (updated: KanbanCard[]) => {
    setKanbanCards(updated);
    try {
      const key = getStorageKey();
      localStorage.setItem(key, JSON.stringify(updated));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("uninova_tasks_updated", { detail: updated }));
      }
    } catch {
      // ignore
    }
  };

  const handleToggleTaskComplete = (cardId: string) => {
    const card = kanbanCards.find((c) => c.id === cardId);
    if (!card) return;

    const nextCompleted = !card.completed;
    const historyEntry: TaskHistoryEntry = {
      id: `hist-${Date.now()}`,
      timestamp: new Date().toISOString(),
      authorName: currentUserName,
      authorEmail: userEmail || "user1@example.edu",
      action: "status_changed",
      detail: `${currentUserName} marcó la tarea como ${nextCompleted ? "Completada ✅" : "Pendiente ⏳"}`,
    };

    const updatedCard: KanbanCard = {
      ...card,
      completed: nextCompleted,
      lastModifiedBy: currentUserName,
      lastModifiedAt: new Date().toISOString(),
      history: [historyEntry, ...(card.history || [])],
    };

    const updated = kanbanCards.map((c) => (c.id === cardId ? updatedCard : c));
    saveKanbanCards(updated);
    if (selectedDrawerCard && selectedDrawerCard.id === cardId) {
      setSelectedDrawerCard(updatedCard);
    }
  };

  const handleUpdateTask = (updatedCard: KanbanCard, customHistory?: TaskHistoryEntry) => {
    const historyEntry: TaskHistoryEntry = customHistory || {
      id: `hist-${Date.now()}`,
      timestamp: new Date().toISOString(),
      authorName: currentUserName,
      authorEmail: userEmail || "user1@example.edu",
      action: "notes_updated",
      detail: `${currentUserName} actualizó los detalles de la tarea`,
    };

    const cardWithHistory: KanbanCard = {
      ...updatedCard,
      lastModifiedBy: currentUserName,
      lastModifiedAt: new Date().toISOString(),
      history: [historyEntry, ...(updatedCard.history || []).filter((h) => h.id !== historyEntry.id)],
    };

    const updated = kanbanCards.map((c) => (c.id === updatedCard.id ? cardWithHistory : c));
    saveKanbanCards(updated);
    setSelectedDrawerCard(cardWithHistory);
  };

  const handleAcceptTemaCard = (cardId: string) => {
    const updated = kanbanCards.map((c) => {
      if (c.id === cardId) {
        return {
          ...c,
          type: "task" as const,
          completed: false,
          priority: "Alta" as const,
          title: c.title.replace(" (Moodle TEMA)", ""),
        };
      }
      return c;
    });
    saveKanbanCards(updated);
  };

  const handleDeleteCard = (cardId: string) => {
    const updated = kanbanCards.filter((c) => c.id !== cardId);
    saveKanbanCards(updated);
    if (selectedDrawerCard && selectedDrawerCard.id === cardId) {
      setSelectedDrawerCard(null);
    }
  };

  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [customSubjectText, setCustomSubjectText] = useState("");

  const handleOpenNewTaskModal = (dayKey: "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "finde" = "lunes") => {
    if (availableSubjects.length === 0 && !isDanielMonoga) {
      setShowEnrollmentModal(true);
      return;
    }
    setNewTaskDay(dayKey);
    setNewTaskTitle("");
    setIsCustomSubject(false);
    setCustomSubjectText("");
    setNewTaskSubject(availableSubjects[0] || "Dibujo en Ingeniería");
    setNewTaskKind("Taller");
    setNewTaskNotes("");
    setShowNewTaskModal(true);
  };

  const handleCreateNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const finalSubject = isCustomSubject && customSubjectText.trim()
      ? customSubjectText.trim()
      : newTaskSubject;

    // If new subject was entered, persist it to user's enrolled subjects
    if (finalSubject && !userEnrolledCourses.includes(finalSubject)) {
      const updatedCourses = [...userEnrolledCourses, finalSubject];
      setUserEnrolledCourses(updatedCourses);
      try {
        const email = userEmail || localStorage.getItem("uninova_user_email") || "guest";
        localStorage.setItem(`uninova_enrolled_courses_${email.toLowerCase().trim()}`, JSON.stringify(updatedCourses));
      } catch {
        // ignore
      }
    }

    const historyEntry: TaskHistoryEntry = {
      id: `hist-${Date.now()}`,
      timestamp: new Date().toISOString(),
      authorName: currentUserName,
      authorEmail: userEmail || "user1@example.edu",
      action: "created",
      detail: `${currentUserName} creó la tarea "${newTaskTitle.trim()}" en el grupo`,
    };

    const newCard: KanbanCard = {
      id: `kb-custom-${Date.now()}`,
      dayKey: newTaskDay,
      type: "task",
      title: newTaskTitle.trim(),
      subject: finalSubject,
      subjectColor: finalSubject.includes("Circuitos")
        ? "blue"
        : finalSubject.includes("Dinámica") || finalSubject.includes("Mecanismos")
        ? "green"
        : finalSubject.includes("Materiales")
        ? "purple"
        : finalSubject.includes("Física") || finalSubject.includes("Dibujo")
        ? "rose"
        : "blue",
      timeText: newTaskTime,
      priority: newTaskPriority,
      taskKind: newTaskKind,
      completed: false,
      weighting: newTaskKind === "Parcial" ? "25% Parcial" : newTaskKind === "Quiz" ? "10% Quiz" : newTaskKind === "Proyecto" ? "15% Proyecto CAD" : "15% Entrega",
      notes: newTaskNotes.trim() || undefined,
      lastModifiedBy: currentUserName,
      lastModifiedAt: new Date().toISOString(),
      history: [historyEntry],
    };

    saveKanbanCards([...kanbanCards, newCard]);
    setShowNewTaskModal(false);
  };

  // Calendar selected day
  const [selectedDay, setSelectedDay] = useState(21);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>(() => {
    if (enrolledCount === 0 && !isDanielMonoga) {
      return [];
    }
    return INITIAL_CALENDAR_EVENTS;
  });

  useEffect(() => {
    if (enrolledCount === 0 && !isDanielMonoga) {
      setCalendarEvents([]);
    }
  }, [enrolledCount, isDanielMonoga]);

  const handleConfirmTemaEvent = (id: string) => {
    setCalendarEvents((prev) =>
      prev.map((ev) => (ev.id === id ? { ...ev, confirmed: true, colorType: "blue" } : ev))
    );
  };

  // Message modal for teachers
  const [selectedTeacher, setSelectedTeacher] = useState<ProfessorItem | null>(null);
  const [teacherMessage, setTeacherMessage] = useState("");
  const [teacherMsgSent, setTeacherMsgSent] = useState(false);

  useEffect(() => {
    const paramTab = searchParams.get("tab") || "resumen";
    setActiveTab(paramTab);
  }, [searchParams]);

  const handleJarvisAsk = (query?: string) => {
    const q = query || jarvisPrompt;
    if (!q.trim()) return;
    setIsJarvisThinking(true);
    setJarvisResponse(null);

    setTimeout(() => {
      setIsJarvisThinking(false);
      if (!isDanielMonoga) {
        setJarvisResponse(
          "💎 **Jarvis AI Pro (Función Exclusiva Plan de Pago)**\n\nEl motor de razonamiento autónomo, síntesis académica y generación de guías paso a paso con IA es exclusivo para suscriptores UniNova Pro.\n\n⚡ Conecta tu cuenta a Telegram para solicitar la activación de tu suscripción Pro."
        );
        return;
      }
      if (q.toLowerCase().includes("resumir") || q.toLowerCase().includes("grashof")) {
        setJarvisResponse(
          "⚙️ **Síntesis Grashof (4 Barras):** Para que al menos una barra dé giro completo continuo: $S + L \\le P + Q$ (donde $S$ es la barra más corta, $L$ la más larga, $P$ y $Q$ las intermedias). Si se fija la barra más corta, se obtiene un mecanismo de manivela-manivela."
        );
      } else if (q.toLowerCase().includes("bernoulli") || q.toLowerCase().includes("edo")) {
        setJarvisResponse(
          "📐 **EDO Bernoulli ($y' + P(x)y = Q(x)y^n$):** Multiplica por $(1-n)y^{-n}$, aplica la sustitución $u = y^{1-n}$ para linealizar en $u' + (1-n)P(x)u = (1-n)Q(x)$, y resuelve con el factor integrante $\\mu(x) = e^{\\int (1-n)P(x)dx}$."
        );
      } else if (q.toLowerCase().includes("plan") || q.toLowerCase().includes("estudio")) {
        setJarvisResponse(
          "🎯 **Plan de Estudio Recomendado:**\n1. 10:00 AM: Repasar condiciones de Grashof.\n2. 2:00 PM: 45 min de práctica en simulador 2D de Mecatrónica.\n3. 4:30 PM: Resolver 3 ejercicios de EDO Bernoulli antes de la entrega de las 11:59 PM."
        );
      } else {
        setJarvisResponse(
          `🤖 **Jarvis:** Analicé tu consulta sobre "${q}". Tienes materiales oficiales de Moodle TEMA sincronizados para esta asignatura. ¿Deseas generar una guía paso a paso o un simulacro de examen?`
        );
      }
    }, 800);
  };

  const handleSendTeacherMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherMessage.trim()) return;
    setTeacherMsgSent(true);
    setTimeout(() => {
      setSelectedTeacher(null);
      setTeacherMessage("");
      setTeacherMsgSent(false);
    }, 1200);
  };

  return (
    <div className="uninova-saas-container">
      {/* 1. IF TAB IS NOT "resumen", RENDER DEDICATED MODULES */}
      {activeTab === "horario" && (
        <section className="uninova-tab-pane">
          <div className="uninova-tab-header">
            <h2 className="uninova-tab-title">⏰ Horario Semanal & Salones</h2>
            <p className="uninova-tab-subtitle">Parrilla completa de clases y laboratorios de Ingeniería Mecatrónica UNAB.</p>
          </div>
          <UniNovaWeeklySchedule
            enrolledCourses={availableSubjects}
            isDanielMonoga={isDanielMonoga}
            onOpenTemaSync={() => setShowEnrollmentModal(true)}
          />
        </section>
      )}

      {activeTab === "simulador" && (
        <section className="uninova-tab-pane">
          <div className="uninova-tab-header">
            <h2 className="uninova-tab-title">🧮 Calculadora de Notas & Cortes</h2>
            <p className="uninova-tab-subtitle">Simula ponderaciones del 30%, 30% y 40% según el reglamento de la UNAB.</p>
          </div>
          <UniNovaGradeSimulator />
        </section>
      )}

      {activeTab === "docentes" && (
        <section className="uninova-tab-pane">
          <div
            style={{
              padding: "60px 24px",
              textAlign: "center",
              borderRadius: "20px",
              background: "var(--color-bg-surface)",
              border: "1px solid var(--color-border)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "18px",
              maxWidth: "680px",
              margin: "0 auto",
            }}
          >
            <div style={{ fontSize: "3.5rem" }}>🔒</div>
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                padding: "4px 12px",
                borderRadius: "20px",
                background: "rgba(239, 68, 68, 0.12)",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.25)",
              }}
            >
              Módulo Bloqueado · Próximamente
            </span>
            <h2 style={{ margin: "0", fontSize: "1.45rem", fontWeight: 800, color: "var(--color-text)" }}>
              Directorio de Docentes & Salones UNAB
            </h2>
            <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--color-text-muted)", lineHeight: 1.6, maxWidth: "520px" }}>
              El catálogo unificado de profesores, geolocalización de salones por bloque y horarios oficiales de atención presencial estará disponible en la próxima actualización institucional.
            </p>
            <Link
              href="/dashboard?tab=resumen"
              className="uninova-btn-secondary"
              onClick={() => setActiveTab("resumen")}
              style={{ marginTop: "10px", textDecoration: "none" }}
            >
              ← Volver al Panel Principal
            </Link>
          </div>
        </section>
      )}

      {activeTab === "configuracion" && (
        <section className="uninova-tab-pane">
          <div className="uninova-tab-header">
            <h2 className="uninova-tab-title">⚙️ Conexiones & Configuración</h2>
            <p className="uninova-tab-subtitle">Vincula tu cuenta con Jarvis en Telegram para recibir alertas en tiempo real.</p>
          </div>
          <div className="uninova-settings-wrapper">
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
          </div>
        </section>
      )}

      {activeTab === "recursos" && (
        <section className="uninova-tab-pane">
          <div className="uninova-tab-header">
            <h2 className="uninova-tab-title">📚 Recursos Institucionales UNAB</h2>
            <p className="uninova-tab-subtitle">Acceso directo a herramientas académicas, bases de datos científicas y portales oficiales.</p>
          </div>
          <div className="uninova-professors-grid">
            <div className="uninova-prof-card">
              <div className="uninova-prof-card-top">
                <div className="uninova-avatar-initials lg" style={{ background: "rgba(14, 165, 233, 0.15)", color: "#0284c7" }}>📖</div>
                <div>
                  <h3 className="uninova-prof-name">Biblioteca Digital UNAB</h3>
                  <span className="uninova-prof-badge">Bases Científicas</span>
                </div>
              </div>
              <div className="uninova-prof-details">
                <p>Acceso a <strong>IEEE Xplore, ScienceDirect, SpringerLink y Scopus</strong> con credenciales institucionales.</p>
                <p><strong>Ubicación:</strong> Campus El Jardín · Bloque B</p>
                <p><strong>Servicio:</strong> Préstamo de libros de ingeniería física y digital.</p>
              </div>
              <a
                href="https://biblioteca.unab.edu.co"
                target="_blank"
                rel="noreferrer"
                className="uninova-btn-secondary full-w"
                style={{ textAlign: "center", textDecoration: "none", display: "block" }}
              >
                🔗 Abrir Biblioteca Digital
              </a>
            </div>

            <div className="uninova-prof-card">
              <div className="uninova-prof-card-top">
                <div className="uninova-avatar-initials lg" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#059669" }}>🎓</div>
                <div>
                  <h3 className="uninova-prof-name">Moodle TEMA UNAB</h3>
                  <span className="uninova-prof-badge">Campus Virtual</span>
                </div>
              </div>
              <div className="uninova-prof-details">
                <p>Plataforma de cursos virtuales, entrega de quices, talleres y material de clase oficial.</p>
                <p><strong>URL Oficial:</strong> tema.unab.edu.co</p>
                <p><strong>Sincronización:</strong> Vinculada automáticamente con UniNova OS.</p>
              </div>
              <Link
                href="/tema"
                className="uninova-btn-secondary full-w"
                style={{ textAlign: "center", textDecoration: "none", display: "block" }}
              >
                ⚡ Ver Bóveda TEMA
              </Link>
            </div>

            <div className="uninova-prof-card">
              <div className="uninova-prof-card-top">
                <div className="uninova-avatar-initials lg" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#d97706" }}>🏛️</div>
                <div>
                  <h3 className="uninova-prof-name">Portal Cosmos UNAB</h3>
                  <span className="uninova-prof-badge">Registro Académico</span>
                </div>
              </div>
              <div className="uninova-prof-details">
                <p>Consulta de calificaciones oficiales, liquidación de matrícula y solicitudes académicas.</p>
                <p><strong>Semestre:</strong> 2026-1</p>
                <p><strong>Estado:</strong> Matrícula Ordinaria Activa</p>
              </div>
              <a
                href="https://cosmos.unab.edu.co"
                target="_blank"
                rel="noreferrer"
                className="uninova-btn-secondary full-w"
                style={{ textAlign: "center", textDecoration: "none", display: "block" }}
              >
                🔗 Acceso Portal Cosmos
              </a>
            </div>

            <div className="uninova-prof-card">
              <div className="uninova-prof-card-top">
                <div className="uninova-avatar-initials lg" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#dc2626" }}>🛠️</div>
                <div>
                  <h3 className="uninova-prof-name">Laboratorios Mecatrónica</h3>
                  <span className="uninova-prof-badge">Talleres D-102 & D-204</span>
                </div>
              </div>
              <div className="uninova-prof-details">
                <p>Protocolos de seguridad, reserva de bancos de pruebas de robótica y osciloscopios.</p>
                <p><strong>Jefe de Lab:</strong> Ing. Hernán Ospina</p>
                <p><strong>Horario de Práctica:</strong> Lun a Vie 7:00 AM - 6:00 PM</p>
              </div>
              <Link
                href="/mecatronica"
                className="uninova-btn-secondary full-w"
                style={{ textAlign: "center", textDecoration: "none", display: "block" }}
              >
                🔬 Abrir Simulador 2D
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 2. MAIN DASHBOARD VIEW (TAB === "resumen", "tareas", OR DEFAULT) */}
      {(activeTab === "resumen" || activeTab === "tareas" || !["horario", "simulador", "docentes", "configuracion", "recursos"].includes(activeTab)) && (
        <div className="uninova-saas-layout">
          {/* LEFT MAIN WORKSPACE (70%) */}
          <main className="uninova-saas-main">
            {/* NOTION DATABASE CONTROLS & VIEW SWITCHER BAR */}
            <header className="uninova-notion-database-header">
              <div className="uninova-greeting-left" style={{ marginBottom: "6px" }}>
                <span className="uninova-sun-icon" aria-hidden="true">☀️</span>
                <div>
                  <h1 className="uninova-greeting-title">¡Buenos días, {currentUserName}!</h1>
                  <p className="uninova-greeting-subtitle">
                    📅 Hoy es {colombiaNow.fullDate} · ⏰ {colombiaNow.timeStr} (Hora Colombia) · Base de Datos Académica
                  </p>
                </div>
              </div>

              <div className="uninova-notion-db-top-row">
                {/* 1. VIEW SWITCHER TABS */}
                <div className="uninova-notion-view-tabs" role="tablist" aria-label="Selector de vistas Notion">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={databaseViewMode === "kanban"}
                    className={`uninova-notion-tab-btn ${databaseViewMode === "kanban" ? "active" : ""}`}
                    onClick={() => setDatabaseViewMode("kanban")}
                  >
                    📋 Tablero Semanal
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={databaseViewMode === "table"}
                    className={`uninova-notion-tab-btn ${databaseViewMode === "table" ? "active" : ""}`}
                    onClick={() => setDatabaseViewMode("table")}
                  >
                    📑 Vista Tabla
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={databaseViewMode === "calendar"}
                    className={`uninova-notion-tab-btn ${databaseViewMode === "calendar" ? "active" : ""}`}
                    onClick={() => setDatabaseViewMode("calendar")}
                  >
                    📅 Calendario
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={databaseViewMode === "list"}
                    className={`uninova-notion-tab-btn ${databaseViewMode === "list" ? "active" : ""}`}
                    onClick={() => setDatabaseViewMode("list")}
                  >
                    📌 Lista Rápida
                  </button>
                </div>

                {/* 2. SEARCH & CONTROLS */}
                <div className="uninova-notion-db-controls">
                  {/* Notion Search Input */}
                  <div className="uninova-notion-search-wrap">
                    <span className="uninova-notion-search-icon">🔍</span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar entrega..."
                      className="uninova-notion-search-input"
                      aria-label="Buscar tareas o entregas"
                    />
                  </div>

                  {/* Subject Filter */}
                  <select
                    value={selectedSubjectFilter}
                    onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                    className="uninova-select-filter"
                    aria-label="Filtrar por asignatura"
                    style={{ height: "32px", fontSize: "0.75rem", padding: "0 8px" }}
                  >
                    {availableSubjects.length > 0 ? (
                      <>
                        <option value="all">📚 Todas las Materias</option>
                        {availableSubjects.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </>
                    ) : (
                      <option value="all">Sin asignaturas registradas</option>
                    )}
                  </select>

                  {/* View Type Filter */}
                  <div className="uninova-view-pills">
                    <button
                      type="button"
                      className={`uninova-view-pill ${selectedViewType === "all" ? "active" : ""}`}
                      onClick={() => setSelectedViewType("all")}
                      style={{ height: "30px", fontSize: "0.72rem", padding: "0 8px" }}
                    >
                      Todo
                    </button>
                    <button
                      type="button"
                      className={`uninova-view-pill ${selectedViewType === "tasks" ? "active" : ""}`}
                      onClick={() => setSelectedViewType("tasks")}
                      style={{ height: "30px", fontSize: "0.72rem", padding: "0 8px" }}
                    >
                      Tareas
                    </button>
                    <button
                      type="button"
                      className={`uninova-view-pill ${selectedViewType === "tema" ? "active" : ""}`}
                      onClick={() => setSelectedViewType("tema")}
                      style={{ height: "30px", fontSize: "0.72rem", padding: "0 8px" }}
                    >
                      TEMA
                    </button>
                  </div>

                  {/* Manage Subjects Button */}
                  <button
                    type="button"
                    className="uninova-btn-secondary"
                    onClick={() => setShowEnrollmentModal(true)}
                    title="Configurar y seleccionar asignaturas matriculadas"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      fontWeight: 700,
                      fontSize: "0.72rem",
                      padding: "0 10px",
                      height: "32px",
                      borderRadius: "7px",
                      whiteSpace: "nowrap",
                      border: "1px solid #bae6fd",
                      background: "#f0f9ff",
                      color: "#0284c7",
                    }}
                  >
                    🎓 Materias ({availableSubjects.length})
                  </button>

                  {/* New Task Button */}
                  <button
                    type="button"
                    className="uninova-btn-primary"
                    onClick={() => handleOpenNewTaskModal("lunes")}
                    style={{
                      fontSize: "0.72rem",
                      padding: "0 11px",
                      height: "32px",
                      borderRadius: "7px",
                    }}
                  >
                    + Nueva Tarea
                  </button>
                </div>
              </div>
            </header>

            {/* NOTION DATABASE VIEWS CONTAINER */}
            <div className="uninova-notion-theme-wrap">
              {/* =========================================================
                  VIEW 1: TABLERO SEMANAL (KANBAN)
                  ========================================================= */}
              {databaseViewMode === "kanban" && (
                <div className="uninova-notion-kanban-board">
                  {KANBAN_DAYS.map((dayCol) => {
                    const dayCards = kanbanCards.filter((card) => {
                      if (card.dayKey !== dayCol.key) return false;
                      if (selectedSubjectFilter !== "all" && !card.subject.includes(selectedSubjectFilter)) return false;
                      if (selectedViewType === "tasks" && card.type !== "task") return false;
                      if (selectedViewType === "tema" && card.type !== "tema_unconfirmed") return false;
                      if (searchQuery.trim()) {
                        const q = searchQuery.toLowerCase().trim();
                        const matchTitle = card.title.toLowerCase().includes(q);
                        const matchSub = card.subject.toLowerCase().includes(q);
                        const matchNotes = (card.notes || "").toLowerCase().includes(q);
                        if (!matchTitle && !matchSub && !matchNotes) return false;
                      }
                      return true;
                    });

                    const isToday = dayCol.key === colombiaNow.todayKey;

                    return (
                      <div
                        key={dayCol.key}
                        className={`uninova-notion-column ${isToday ? "today-col" : ""}`}
                      >
                        {/* Column Header */}
                        <div className="uninova-notion-col-header">
                          <div className="uninova-col-title-wrap">
                            <span className="uninova-col-day-name">{dayCol.label}</span>
                            {isToday && <span className="uninova-today-pill">HOY</span>}
                          </div>
                          <span className="uninova-col-counter">{dayCards.length}</span>
                        </div>

                        {/* Cards Container */}
                        <div className="uninova-notion-col-cards">
                          {dayCards.length === 0 ? (
                            <div className="uninova-notion-empty-col">
                              Sin actividades
                            </div>
                          ) : (
                            dayCards.map((card) => {
                              if (card.type === "tema_unconfirmed" && !card.completed) {
                                return (
                                  <div
                                    key={card.id}
                                    className="uninova-notion-card tema-draft"
                                    onClick={() => setSelectedDrawerCard(card)}
                                    style={{ cursor: "pointer" }}
                                  >
                                    <div className="uninova-notion-card-tag-row">
                                      <span className="uninova-notion-tag purple">
                                        🟣 INFO TEMA
                                      </span>
                                      <span className="uninova-notion-tag-muted">Borrador</span>
                                    </div>

                                    <h3 className="uninova-notion-card-title muted">
                                      {card.title}
                                    </h3>

                                    <div className="uninova-notion-card-meta">
                                      <span>📚 {card.subject}</span>
                                      <span>⏰ {card.timeText}</span>
                                    </div>

                                    <button
                                      type="button"
                                      className="uninova-btn-accept-tema full-w"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAcceptTemaCard(card.id);
                                      }}
                                    >
                                      ✅ Aceptar y Habilitar Fecha
                                    </button>
                                  </div>
                                );
                              }

                              const isTaskCompleted = Boolean(card.completed);
                              const kindBadge = getTaskKindBadge(card);

                              return (
                                <div
                                  key={card.id}
                                  className={`uninova-notion-card ${isTaskCompleted ? "completed" : ""}`}
                                  onClick={() => setSelectedDrawerCard(card)}
                                  onDoubleClick={() => setSelectedDrawerCard(card)}
                                  style={{ cursor: "pointer" }}
                                  title="Haz clic para abrir detalles en panel lateral Notion"
                                >
                                  <div className="uninova-notion-card-tag-row">
                                    <span className={`uninova-notion-tag ${card.subjectColor}`} title={card.subject}>
                                      📚 {card.subject}
                                    </span>
                                    {card.priority && (
                                      <span className={`uninova-priority-badge ${card.priority.toLowerCase()}`}>
                                        {card.priority === "Alta" ? "🔴 Alta" : card.priority === "Media" ? "🟡 Media" : "🟢 Normal"}
                                      </span>
                                    )}
                                    <span
                                      className="uninova-task-kind-badge"
                                      style={{
                                        backgroundColor: kindBadge.bg,
                                        color: kindBadge.color,
                                        border: `1px solid ${kindBadge.border}`,
                                        fontSize: "0.6rem",
                                        fontWeight: 700,
                                        padding: "1px 4px",
                                        borderRadius: "3px",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        lineHeight: 1.1,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {kindBadge.label}
                                    </span>
                                  </div>

                                  <div className="uninova-notion-task-main">
                                    <label
                                      className="uninova-notion-checkbox-wrap"
                                      aria-label={`Marcar como completada: ${card.title}`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isTaskCompleted}
                                        onChange={() => handleToggleTaskComplete(card.id)}
                                        className="uninova-notion-checkbox"
                                      />
                                    </label>

                                    <div
                                      className="uninova-notion-task-content"
                                      onClick={() => setSelectedDrawerCard(card)}
                                    >
                                      <h3 className={`uninova-notion-card-title ${isTaskCompleted ? "line-through" : ""}`}>
                                        {card.title}
                                      </h3>

                                      <div className="uninova-notion-card-meta">
                                        <time>⏰ {card.timeText}</time>
                                        {card.notes && (
                                          <p className="uninova-card-note">
                                            💡 {card.notes}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      className="uninova-delete-card-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteCard(card.id);
                                      }}
                                      title="Eliminar tarea"
                                      aria-label={`Eliminar tarea ${card.title}`}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Column Quick Add Button */}
                        <button
                          type="button"
                          className="uninova-notion-add-card-btn"
                          onClick={() => handleOpenNewTaskModal(dayCol.key)}
                        >
                          + Añadir tarea
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* =========================================================
                  VIEW 2: VISTA TABLA NOTION
                  ========================================================= */}
              {databaseViewMode === "table" && (
                <div className="uninova-notion-table-container">
                  <table className="uninova-notion-table">
                    <thead>
                      <tr>
                        <th style={{ width: "40px", textAlign: "center" }}>✓</th>
                        <th>Nombre de la Entrega / Actividad</th>
                        <th>Asignatura</th>
                        <th>Tipo</th>
                        <th>Día de Entrega</th>
                        <th>Hora Límite</th>
                        <th>Ponderación</th>
                        <th style={{ width: "70px", textAlign: "center" }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kanbanCards
                        .filter((card) => {
                          if (selectedSubjectFilter !== "all" && !card.subject.includes(selectedSubjectFilter)) return false;
                          if (selectedViewType === "tasks" && card.type !== "task") return false;
                          if (selectedViewType === "tema" && card.type !== "tema_unconfirmed") return false;
                          if (searchQuery.trim()) {
                            const q = searchQuery.toLowerCase().trim();
                            const matchTitle = card.title.toLowerCase().includes(q);
                            const matchSub = card.subject.toLowerCase().includes(q);
                            const matchNotes = (card.notes || "").toLowerCase().includes(q);
                            if (!matchTitle && !matchSub && !matchNotes) return false;
                          }
                          return true;
                        })
                        .map((card) => {
                          const isCompleted = Boolean(card.completed);
                          const kindBadge = getTaskKindBadge(card);
                          const dayNames: Record<string, string> = {
                            lunes: "Lunes",
                            martes: "Martes",
                            miercoles: "Miércoles",
                            jueves: "Jueves",
                            viernes: "Viernes",
                            finde: "Fin de Semana",
                          };

                          return (
                            <tr
                              key={card.id}
                              className={`uninova-notion-table-row ${isCompleted ? "completed" : ""}`}
                              onClick={() => setSelectedDrawerCard(card)}
                            >
                              <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isCompleted}
                                  onChange={() => handleToggleTaskComplete(card.id)}
                                  className="uninova-notion-checkbox"
                                />
                              </td>
                              <td>
                                <div className="uninova-table-task-name">
                                  <span>{card.title}</span>
                                </div>
                              </td>
                              <td>
                                <span className={`uninova-notion-tag ${card.subjectColor || "blue"}`}>
                                  {card.subject}
                                </span>
                              </td>
                              <td>
                                <span
                                  className="uninova-table-badge"
                                  style={{
                                    backgroundColor: kindBadge.bg,
                                    color: kindBadge.color,
                                    border: `1px solid ${kindBadge.border}`,
                                  }}
                                >
                                  {kindBadge.label}
                                </span>
                              </td>
                              <td style={{ fontWeight: 600 }}>
                                📅 {dayNames[card.dayKey] || card.dayKey}
                              </td>
                              <td style={{ color: "var(--notion-ink-muted, #615d59)", fontWeight: 600 }}>
                                ⏰ {card.timeText}
                              </td>
                              <td>
                                <span style={{ background: "var(--notion-canvas-soft, #f6f5f4)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.74rem", fontWeight: 700 }}>
                                  {card.weighting || "15%"}
                                </span>
                              </td>
                              <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  className="uninova-delete-card-btn"
                                  onClick={() => handleDeleteCard(card.id)}
                                  title="Eliminar"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      {kanbanCards.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "var(--notion-ink-muted, #615d59)" }}>
                            No hay entregas registradas. Añade una nueva tarea o sincroniza con Moodle TEMA.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* =========================================================
                  VIEW 3: VISTA CALENDARIO MENSUAL / SEMANAL
                  ========================================================= */}
              {databaseViewMode === "calendar" && (
                <div className="uninova-notion-calendar-view">
                  <div className="uninova-notion-cal-grid">
                    {KANBAN_DAYS.map((dayCol) => {
                      const isToday = dayCol.key === colombiaNow.todayKey;
                      const dayCards = kanbanCards.filter((card) => {
                        if (card.dayKey !== dayCol.key) return false;
                        if (selectedSubjectFilter !== "all" && !card.subject.includes(selectedSubjectFilter)) return false;
                        if (selectedViewType === "tasks" && card.type !== "task") return false;
                        if (selectedViewType === "tema" && card.type !== "tema_unconfirmed") return false;
                        if (searchQuery.trim()) {
                          const q = searchQuery.toLowerCase().trim();
                          const matchTitle = card.title.toLowerCase().includes(q);
                          const matchSub = card.subject.toLowerCase().includes(q);
                          if (!matchTitle && !matchSub) return false;
                        }
                        return true;
                      });

                      return (
                        <div key={dayCol.key} className={`uninova-notion-cal-day-cell ${isToday ? "today" : ""}`}>
                          <div className="uninova-notion-cal-day-header">
                            <span>{dayCol.label}</span>
                            <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>{dayCol.dateStr}</span>
                          </div>

                          <div className="uninova-notion-cal-events-wrap">
                            {dayCards.map((c) => {
                              const isTaskCompleted = Boolean(c.completed);
                              return (
                                <div
                                  key={c.id}
                                  className={`uninova-notion-cal-pill ${c.subjectColor || "blue"}`}
                                  onClick={() => setSelectedDrawerCard(c)}
                                  style={{
                                    textDecoration: isTaskCompleted ? "line-through" : "none",
                                    opacity: isTaskCompleted ? 0.6 : 1,
                                    background: isTaskCompleted ? "#e2e8f0" : undefined,
                                  }}
                                  title={`${c.title} · ${c.timeText}`}
                                >
                                  {isTaskCompleted ? "✅ " : "📌 "}
                                  {c.title}
                                </div>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            className="uninova-notion-add-card-btn"
                            onClick={() => handleOpenNewTaskModal(dayCol.key)}
                            style={{ padding: "2px 4px", fontSize: "0.7rem" }}
                          >
                            + Tarea
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* =========================================================
                  VIEW 4: VISTA LISTA RÁPIDA (CHECKLIST MINIMALISTA)
                  ========================================================= */}
              {databaseViewMode === "list" && (
                <div className="uninova-notion-list-view">
                  {kanbanCards
                    .filter((card) => {
                      if (selectedSubjectFilter !== "all" && !card.subject.includes(selectedSubjectFilter)) return false;
                      if (selectedViewType === "tasks" && card.type !== "task") return false;
                      if (selectedViewType === "tema" && card.type !== "tema_unconfirmed") return false;
                      if (searchQuery.trim()) {
                        const q = searchQuery.toLowerCase().trim();
                        const matchTitle = card.title.toLowerCase().includes(q);
                        const matchSub = card.subject.toLowerCase().includes(q);
                        if (!matchTitle && !matchSub) return false;
                      }
                      return true;
                    })
                    .map((card) => {
                      const isCompleted = Boolean(card.completed);
                      const kindBadge = getTaskKindBadge(card);

                      return (
                        <div
                          key={card.id}
                          className="uninova-notion-list-item"
                          onClick={() => setSelectedDrawerCard(card)}
                        >
                          <div className="uninova-notion-list-left">
                            <label onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isCompleted}
                                onChange={() => handleToggleTaskComplete(card.id)}
                                className="uninova-notion-checkbox"
                              />
                            </label>

                            <span className={`uninova-notion-list-title ${isCompleted ? "completed" : ""}`}>
                              {card.title}
                            </span>
                          </div>

                          <div className="uninova-notion-list-tags">
                            <span className={`uninova-notion-tag ${card.subjectColor || "blue"}`}>
                              {card.subject}
                            </span>
                            <span
                              className="uninova-table-badge"
                              style={{
                                backgroundColor: kindBadge.bg,
                                color: kindBadge.color,
                                border: `1px solid ${kindBadge.border}`,
                              }}
                            >
                              {kindBadge.label}
                            </span>
                            <time style={{ fontSize: "0.74rem", color: "var(--notion-ink-muted, #615d59)", fontWeight: 600 }}>
                              ⏰ {card.timeText}
                            </time>
                            <button
                              type="button"
                              className="uninova-delete-card-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCard(card.id);
                              }}
                              title="Eliminar tarea"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  {kanbanCards.length === 0 && (
                    <div style={{ padding: "28px", textAlign: "center", color: "var(--notion-ink-muted, #615d59)" }}>
                      No hay tareas en la lista rápida. ¡Añade tu primera entrega!
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SaaS Footer */}
            <footer className="uninova-saas-footer">
              <span>UniNova OS · Universidad Autónoma de Bucaramanga</span>
              <div className="uninova-footer-links">
                <a href="#terminos">Términos</a>
                <span>·</span>
                <a href="#privacidad">Privacidad</a>
                <span>·</span>
                <a href="#soporte">Soporte Telegram</a>
              </div>
            </footer>
          </main>

          {/* RIGHT SIDEBAR COLUMN (30%) */}
          <aside className="uninova-saas-aside" aria-label="Asistente Jarvis y agenda diaria">
            {/* 1. JARVIS AI ASSISTANT CARD WITH VIDEO HUD (PRO PLAN EXCLUSIVE) */}
            <section className="uninova-jarvis-card" aria-labelledby="jarvis-card-title">
              <div className="uninova-jarvis-header">
                <div className="uninova-jarvis-title-group">
                  <div className="uninova-jarvis-avatar pro">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                  <div>
                    <div className="uninova-jarvis-name-wrap">
                      <h3 id="jarvis-card-title" className="uninova-jarvis-name">Jarvis AI Core</h3>
                      <span className="uninova-pro-badge">👑 EXCLUSIVO PRO</span>
                    </div>
                    <p className="uninova-jarvis-role">Asistente Autónomo · {colombiaNow.timeStr} (Bogotá)</p>
                  </div>
                </div>
              </div>

              {/* WebGL Seamless 1:1 HUD Orb Video - Always visible for top aesthetics */}
              <div className="uninova-jarvis-hud-container">
                <JarvisHudOrb size={170} mode="alpha" />
              </div>

              {/* Speech Bubble: Explaining Pro Status */}
              <div className="uninova-jarvis-bubble pro-mode">
                <div className="uninova-jarvis-bubble-header">
                  <span className="uninova-live-dot" />
                  <strong>Jarvis AI está activo (Exclusivo Plan Pro)</strong>
                </div>
                <p>
                  Asistente de inteligencia artificial para síntesis de materias, guías de clase y recordatorios automáticos 24/7 vinculados a tu Telegram.
                </p>
              </div>

              {/* Direct Telegram CTA Button */}
              <div className="uninova-jarvis-pro-cta-wrap">
                <a
                  href="https://t.me/monoga_jarvis_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="uninova-btn-primary full-w accent"
                >
                  ⚡ Conectar Jarvis Pro en Telegram
                </a>
              </div>

              {/* Quick AI Action Chips */}
              <div className="uninova-jarvis-chips-grid">
                <button
                  type="button"
                  className="uninova-chip-btn"
                  onClick={() => handleJarvisAsk("Resumir un tema de Grashof")}
                >
                  🪄 Resumir un tema
                </button>
                <button
                  type="button"
                  className="uninova-chip-btn"
                  onClick={() => handleJarvisAsk("Explicar un concepto de EDO Bernoulli")}
                >
                  📖 Explicar un concepto
                </button>
                <button
                  type="button"
                  className="uninova-chip-btn"
                  onClick={() => handleJarvisAsk("Crear un plan de estudio")}
                >
                  📝 Crear un plan de estudio
                </button>
                <button
                  type="button"
                  className="uninova-chip-btn"
                  onClick={() => handleJarvisAsk("Preparar un parcial de Dinámica")}
                >
                  🎯 Preparar un parcial
                </button>
              </div>

              {/* Response Display */}
              {isJarvisThinking && (
                <div className="uninova-jarvis-response thinking">
                  <span className="uninova-spin-dot" /> Jarvis está procesando con IA...
                </div>
              )}

              {jarvisResponse && !isJarvisThinking && (
                <div className="uninova-jarvis-response">
                  <div className="uninova-jarvis-response-text">{jarvisResponse}</div>
                </div>
              )}

              {/* Question Input Box */}
              <form
                className="uninova-jarvis-input-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleJarvisAsk();
                }}
              >
                <input
                  type="text"
                  placeholder="Pregúntale a Jarvis AI..."
                  value={jarvisPrompt}
                  onChange={(e) => setJarvisPrompt(e.target.value)}
                  className="uninova-jarvis-input"
                  aria-label="Preguntarle a Jarvis"
                />
                <button
                  type="submit"
                  className="uninova-jarvis-send-btn"
                  aria-label="Enviar pregunta a Jarvis"
                  disabled={!jarvisPrompt.trim() || isJarvisThinking}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </form>
            </section>

            {/* 2. MINI CALENDARIO MENSUAL */}
            <section className="uninova-calendar-card" aria-labelledby="calendar-card-title">
              <div className="uninova-calendar-header">
                <h3 id="calendar-card-title" className="uninova-calendar-title">Septiembre 2026</h3>
                <div className="uninova-calendar-nav">
                  <button type="button" className="uninova-cal-arrow" aria-label="Mes anterior">‹</button>
                  <button type="button" className="uninova-cal-arrow" aria-label="Mes siguiente">›</button>
                  <button type="button" className="uninova-cal-today-btn">Hoy</button>
                </div>
              </div>

              {/* Days of Week Header */}
              <div className="uninova-calendar-grid header">
                <span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span>
              </div>

              {/* Days Grid */}
              <div className="uninova-calendar-grid days">
                {[14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27].map((day) => {
                  const isSelected = day === selectedDay;
                  return (
                    <button
                      key={day}
                      type="button"
                      className={`uninova-cal-day ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedDay(day)}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Selected Day Agenda */}
              <div className="uninova-cal-selected-events">
                <div className="uninova-cal-events-header">
                  <strong>{selectedDay === 21 ? "Lun" : selectedDay === 22 ? "Mar" : selectedDay === 23 ? "Mié" : selectedDay === 24 ? "Jue" : selectedDay === 25 ? "Vie" : selectedDay === 26 ? "Sáb" : selectedDay === 27 ? "Dom" : "Día"}, {selectedDay} de sep</strong>
                  <span className="uninova-event-count">
                    {calendarEvents.filter((e) => e.day === selectedDay).length} eventos
                  </span>
                </div>

                {calendarEvents.filter((e) => e.day === selectedDay).length > 0 ? (
                  <>
                    <div className="uninova-tema-legend-pill">
                      <span className="tema-dot-indicator" />
                      <span>Fechas de TEMA requieren aprobación estudiantil para habilitarse.</span>
                    </div>

                    <ul className="uninova-day-events-list">
                      {calendarEvents
                        .filter((ev) => ev.day === selectedDay)
                        .map((ev) => {
                          const isTemaUnconfirmed = ev.source === "tema" && !ev.confirmed;

                          if (isTemaUnconfirmed) {
                            return (
                              <li key={ev.id} className="uninova-cal-event-card tema-unconfirmed">
                                <div className="uninova-tema-card-header">
                                  <span className="uninova-tema-kicker-badge">
                                    🟣 INFORMACIÓN DE TEMA (Sin confirmar)
                                  </span>
                                  <span className="uninova-status-muted">Deshabilitada</span>
                                </div>

                                <div className="uninova-tema-card-body">
                                  <strong className="uninova-tema-event-title">{ev.title}</strong>
                                  <span className="uninova-tema-event-loc">{ev.location}</span>
                                  <time className="uninova-tema-event-time">⏰ {ev.timeRange}</time>
                                </div>

                                <div className="uninova-tema-card-actions">
                                  <button
                                    type="button"
                                    className="uninova-btn-confirm-tema"
                                    onClick={() => handleConfirmTemaEvent(ev.id)}
                                  >
                                    ✅ Aceptar y Habilitar Fecha
                                  </button>
                                </div>
                              </li>
                            );
                          }

                          return (
                            <li key={ev.id} className="uninova-cal-event-card confirmed">
                              {ev.source === "tema" && (
                                <div className="uninova-tema-card-header confirmed">
                                  <span className="uninova-confirmed-badge">
                                    🔵 FECHA CONFIRMADA POR ESTUDIANTE
                                  </span>
                                </div>
                              )}
                              <div className="uninova-event-row">
                                <span className={`uninova-dot ${ev.colorType}`} />
                                <div className="uninova-event-info">
                                  <strong>{ev.title}</strong>
                                  <small>{ev.location}</small>
                                </div>
                                <time className="uninova-event-time">{ev.timeRange}</time>
                              </div>
                            </li>
                          );
                        })}
                    </ul>
                  </>
                ) : (
                  <div
                    style={{
                      padding: "20px 14px",
                      textAlign: "center",
                      borderRadius: "12px",
                      background: "#f8fafc",
                      border: "1px dashed #e2e8f0",
                      marginTop: "12px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span style={{ fontSize: "24px" }}>📅</span>
                    <p style={{ margin: 0, fontSize: "0.84rem", color: "#64748b", lineHeight: 1.45 }}>
                      No hay eventos programados para este día. Gestiona tus asignaturas o añade una nueva tarea al tablero.
                    </p>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
                      <button
                        type="button"
                        className="uninova-btn-secondary"
                        onClick={() => setShowEnrollmentModal(true)}
                        style={{
                          fontSize: "0.8rem",
                          padding: "6px 12px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        🎓 Gestionar Materias
                      </button>
                      <button
                        type="button"
                        className="uninova-btn-primary"
                        onClick={() => handleOpenNewTaskModal("lunes")}
                        style={{
                          fontSize: "0.8rem",
                          padding: "6px 12px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        + Nueva Tarea
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* 3. DOCENTES DE HOY */}
            <section className="uninova-teachers-card" aria-labelledby="teachers-card-title">
              <div className="uninova-teachers-header">
                <div className="uninova-section-title-wrap">
                  <span className="uninova-section-icon" aria-hidden="true">👥</span>
                  <h3 id="teachers-card-title" className="uninova-teachers-title">Docentes de Hoy</h3>
                </div>
                <button
                  type="button"
                  className="uninova-link-btn"
                  onClick={() => setActiveTab("docentes")}
                >
                  Ver todos →
                </button>
              </div>

              <div className="uninova-teachers-list">
                {UNAB_PROFESSORS.map((teacher) => (
                  <div key={teacher.id} className="uninova-teacher-row">
                    <div className="uninova-avatar-initials md">{teacher.avatarFallback}</div>
                    <div className="uninova-teacher-info">
                      <strong className="uninova-teacher-name">{teacher.name}</strong>
                      <span className="uninova-teacher-subject">{teacher.subject}</span>
                    </div>
                    <button
                      type="button"
                      className="uninova-mail-btn"
                      aria-label={`Enviar mensaje a ${teacher.name}`}
                      onClick={() => setSelectedTeacher(teacher)}
                    >
                      ✉️
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      )}

      {/* NEW TASK NOTION MODAL */}
      {/* NEW TASK NOTION MODAL */}
      {showNewTaskModal && (
        <div className="uninova-modal-backdrop" onClick={() => setShowNewTaskModal(false)}>
          <div className="uninova-modal-card auth-popup" onClick={(e) => e.stopPropagation()}>
            <div className="uninova-modal-header">
              <div className="uninova-auth-modal-title">
                <span className="uninova-brand-badge" style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}>+</span>
                <h3>Nueva Tarea o Entrega</h3>
              </div>
              <button
                type="button"
                className="uninova-modal-close"
                onClick={() => setShowNewTaskModal(false)}
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>
            <p className="uninova-modal-sub">
              Añade una tarea o entrega a tu tablero semanal de Ingeniería Mecatrónica.
            </p>

            <form onSubmit={handleCreateNewTask} className="uninova-modal-form">
              <div className="uninova-auth-field-group">
                <label htmlFor="task-title-input" className="uninova-auth-label">
                  Título de la Tarea / Taller:
                </label>
                <input
                  id="task-title-input"
                  type="text"
                  required
                  placeholder="Ej. Taller 3: Síntesis de Mecanismos 4 Barras..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="uninova-auth-input"
                  style={{ paddingLeft: "14px" }}
                  autoFocus
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <div className="uninova-auth-field-group">
                  <label htmlFor="task-day-select" className="uninova-auth-label">Día:</label>
                  <select
                    id="task-day-select"
                    value={newTaskDay}
                    onChange={(e) => setNewTaskDay(e.target.value as typeof newTaskDay)}
                    className="uninova-select-filter"
                    style={{ width: "100%", height: "46px" }}
                  >
                    <option value="lunes">Lunes</option>
                    <option value="martes">Martes</option>
                    <option value="miercoles">Miércoles</option>
                    <option value="jueves">Jueves</option>
                    <option value="viernes">Viernes</option>
                    <option value="finde">Fin de Semana</option>
                  </select>
                </div>

                <div className="uninova-auth-field-group">
                  <label htmlFor="task-priority-select" className="uninova-auth-label">Prioridad:</label>
                  <select
                    id="task-priority-select"
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as typeof newTaskPriority)}
                    className="uninova-select-filter"
                    style={{ width: "100%", height: "46px" }}
                  >
                    <option value="Alta">🔴 Alta</option>
                    <option value="Media">🟡 Media</option>
                    <option value="Normal">🟢 Normal</option>
                  </select>
                </div>

                <div className="uninova-auth-field-group">
                  <label htmlFor="task-kind-select" className="uninova-auth-label">Tipo:</label>
                  <select
                    id="task-kind-select"
                    value={newTaskKind}
                    onChange={(e) => setNewTaskKind(e.target.value as typeof newTaskKind)}
                    className="uninova-select-filter"
                    style={{ width: "100%", height: "46px" }}
                  >
                    <option value="Parcial">🎯 Parcial</option>
                    <option value="Taller">📝 Taller</option>
                    <option value="Quiz">⚡ Quiz</option>
                    <option value="Laboratorio">🔬 Laboratorio</option>
                    <option value="Proyecto">📐 Proyecto CAD</option>
                    <option value="Portafolio">📖 Portafolio</option>
                    <option value="Entrega">📌 Entrega</option>
                  </select>
                </div>
              </div>

              <div className="uninova-auth-field-group">
                <label htmlFor="task-subject-select" className="uninova-auth-label">Asignatura:</label>
                <select
                  id="task-subject-select"
                  value={isCustomSubject ? "__custom__" : newTaskSubject}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setIsCustomSubject(true);
                    } else {
                      setIsCustomSubject(false);
                      setNewTaskSubject(e.target.value);
                    }
                  }}
                  className="uninova-select-filter"
                  style={{ width: "100%", height: "46px" }}
                >
                  {availableSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                  {!availableSubjects.includes("Dibujo en Ingeniería") && (
                    <option value="Dibujo en Ingeniería">Dibujo en Ingeniería</option>
                  )}
                  <option value="__custom__">✨ + Otra Asignatura / Personalizada...</option>
                </select>

                {isCustomSubject && (
                  <input
                    type="text"
                    required
                    placeholder="Escribe el nombre de la materia (ej. Dibujo en Ingeniería)"
                    value={customSubjectText}
                    onChange={(e) => setCustomSubjectText(e.target.value)}
                    className="uninova-auth-input"
                    style={{ marginTop: "8px", paddingLeft: "14px" }}
                    autoFocus
                  />
                )}
              </div>

              <div className="uninova-auth-field-group">
                <label htmlFor="task-time-input" className="uninova-auth-label">Hora Límite:</label>
                <input
                  id="task-time-input"
                  type="text"
                  placeholder="Ej. 11:59 PM, 6:00 PM..."
                  value={newTaskTime}
                  onChange={(e) => setNewTaskTime(e.target.value)}
                  className="uninova-auth-input"
                  style={{ paddingLeft: "14px" }}
                />
              </div>

              <div className="uninova-auth-field-group">
                <label htmlFor="task-notes-input" className="uninova-auth-label">Notas adicionales (opcional):</label>
                <textarea
                  id="task-notes-input"
                  rows={2}
                  placeholder="Ej. Revisar ejercicios del libro página 140..."
                  value={newTaskNotes}
                  onChange={(e) => setNewTaskNotes(e.target.value)}
                  className="uninova-modal-textarea"
                />
              </div>

              <div className="uninova-modal-actions">
                <button
                  type="button"
                  className="uninova-btn-secondary"
                  onClick={() => setShowNewTaskModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="uninova-btn-primary">
                  + Guardar Tarea en Tablero
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEACHER DIRECT MESSAGE MODAL */}
      {selectedTeacher && (
        <div className="uninova-modal-backdrop" onClick={() => setSelectedTeacher(null)}>
          <div className="uninova-modal-card auth-popup" onClick={(e) => e.stopPropagation()}>
            <div className="uninova-modal-header">
              <div className="uninova-auth-modal-title">
                <span className="uninova-brand-badge" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>✉️</span>
                <h3>Contactar a {selectedTeacher.name}</h3>
              </div>
              <button
                type="button"
                className="uninova-modal-close"
                onClick={() => setSelectedTeacher(null)}
              >
                ✕
              </button>
            </div>
            <p className="uninova-modal-sub">
              Docente de {selectedTeacher.subject} · {selectedTeacher.campus}
            </p>

            {teacherMsgSent ? (
              <div className="uninova-modal-success">
                <span style={{ fontSize: "18px" }}>✅</span>
                <span>¡Mensaje enviado con éxito al correo {selectedTeacher.email}!</span>
              </div>
            ) : (
              <form onSubmit={handleSendTeacherMessage} className="uninova-modal-form">
                <div className="uninova-auth-field-group">
                  <label htmlFor="teacher-message-text" className="uninova-auth-label">Consulta académica:</label>
                  <textarea
                    id="teacher-message-text"
                    rows={4}
                    required
                    placeholder="Profesor, le escribo para resolver una duda sobre el taller..."
                    value={teacherMessage}
                    onChange={(e) => setTeacherMessage(e.target.value)}
                    className="uninova-modal-textarea"
                  />
                </div>
                <div className="uninova-modal-actions">
                  <button
                    type="button"
                    className="uninova-btn-secondary"
                    onClick={() => setSelectedTeacher(null)}
                  >
                    Cerrar
                  </button>
                  <button type="submit" className="uninova-btn-primary">
                    Enviar Mensaje →
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}



      {/* DISCORD-STYLE SLIDING LATERAL TASK DRAWER */}
      {selectedDrawerCard && (
        <UniNovaTaskDrawer
          card={selectedDrawerCard}
          onClose={() => setSelectedDrawerCard(null)}
          currentUserName={currentUserName}
          currentUserEmail={userEmail || (typeof window !== "undefined" ? localStorage.getItem("uninova_user_email") || "user1@example.edu" : "user1@example.edu")}
          onToggleComplete={(id) => handleToggleTaskComplete(id)}
          onUpdateTask={(updatedCard, historyEntry) => handleUpdateTask(updatedCard, historyEntry)}
          onSaveNotes={(id, notes, weighting) => {
            const card = kanbanCards.find((c) => c.id === id);
            if (card) {
              handleUpdateTask({ ...card, notes, weighting: weighting || card.weighting });
            }
          }}
          onDelete={(id) => {
            handleDeleteCard(id);
            setSelectedDrawerCard(null);
          }}
        />
      )}

      {/* MULTI-STEP COURSE ENROLLMENT MODAL */}
      {showEnrollmentModal && (
        <UniNovaEnrollmentModal
          userEmail={userEmail || undefined}
          initialSelected={availableSubjects}
          onSave={(selectedCourses) => {
            setUserEnrolledCourses(selectedCourses);
            setShowEnrollmentModal(false);
            try {
              const email = userEmail || localStorage.getItem("uninova_user_email") || "guest";
              localStorage.setItem(`uninova_enrolled_courses_${email.toLowerCase().trim()}`, JSON.stringify(selectedCourses));
              localStorage.setItem(`uninova_enrollment_done_${email.toLowerCase().trim()}`, "1");
            } catch {
              // ignore
            }
          }}
          onClose={() => setShowEnrollmentModal(false)}
        />
      )}
    </div>
  );
}
