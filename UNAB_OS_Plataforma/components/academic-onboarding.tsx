"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  findOrCreateCatalogEntry,
  findOrCreateSection,
  joinSection as joinSectionAction,
  leaveSection as leaveSectionAction,
  enrollInMultipleSubjects,
} from "@/app/actions/academic-collaboration";
import { normalizeCatalogKey, type AcademicActionState } from "@/lib/domain/academic-collaboration";

type CatalogItem = { id: string; display_name: string; normalized_key: string };
type SectionItem = {
  id: string;
  subject_id: string;
  professor_id: string;
  term: string;
  subjects?: { display_name?: string | null } | null;
  professors?: { display_name?: string | null } | null;
};

type Props = {
  subjects: CatalogItem[];
  professors: CatalogItem[];
  sections: SectionItem[];
  membershipSectionIds: string[];
  currentTermKey: string;
};

type CareerProgram = {
  id: string;
  title: string;
  icon: string;
  badge: string;
  description: string;
  duration: string;
  subjectKeys: string[];
};

const CAREER_PROGRAMS: CareerProgram[] = [
  {
    id: "mecatronica",
    title: "Ingeniería Mecatrónica",
    icon: "🤖",
    badge: "Automatización & Robótica",
    description: "Sistemas mecatrónicos, robótica industrial, cinemática, circuitos y manufactura avanzada.",
    duration: "10 Semestres",
    subjectKeys: [
      "mecanismos",
      "materiales",
      "dibujo asistido por computador",
      "circuitos electricos",
      "calculo",
      "ecuaciones diferenciales",
      "laboratorio de ondas y particulas",
      "ondas y particulas",
    ],
  },
  {
    id: "industrial",
    title: "Ingeniería Industrial",
    icon: "📈",
    badge: "Operaciones & Analítica",
    description: "Optimización de procesos, gestión de cadena de suministros, modelos estadísticos y calidad.",
    duration: "10 Semestres",
    subjectKeys: [
      "circuitos electricos",
      "calculo",
      "ecuaciones diferenciales",
      "estadistica inferencial y muestreo",
    ],
  },
  {
    id: "financiera",
    title: "Ingeniería Financiera",
    icon: "💳",
    badge: "Mercados & Riesgo",
    description: "Modelación cuantitativa, econometría, gestión de riesgo financiero y analítica de datos.",
    duration: "10 Semestres",
    subjectKeys: [
      "estadistica inferencial y muestreo",
      "calculo",
      "ecuaciones diferenciales",
    ],
  },
  {
    id: "ciencias",
    title: "Ciencias Básicas de Ingeniería",
    icon: "📐",
    badge: "Tronco Común",
    description: "Fundamentos matemáticos y físicos transversales para todas las ingenierías UNAB.",
    duration: "Ciclo Básico",
    subjectKeys: [
      "calculo",
      "ecuaciones diferenciales",
      "laboratorio de ondas y particulas",
      "ondas y particulas",
    ],
  },
];

// Metadatos explicativos para distinguir materias claramente
const SUBJECT_METADATA: Record<string, { icon: string; description: string; code: string }> = {
  calculo: {
    icon: "📘",
    code: "MAT-101",
    description: "Cálculo Diferencial e Integral · Límites, derivadas, razones de cambio, integrales definidas y optimización.",
  },
  "ecuaciones diferenciales": {
    icon: "📐",
    code: "MAT-202",
    description: "Ecuaciones Diferenciales Ordinarias · EDOs de 1er y 2do orden, transformadas de Laplace y sistemas lineales.",
  },
  "circuitos electricos": {
    icon: "⚡",
    code: "CIR-301",
    description: "Circuitos Eléctricos I · Leyes de Kirchhoff, análisis nodal/mallas, Teorema de Thévenin y corriente alterna.",
  },
  mecanismos: {
    icon: "⚙️",
    code: "MEC-302",
    description: "Mecanismos y Máquinas · Grados de libertad, análisis cinemático, centros instantáneos y síntesis de eslabonamientos.",
  },
  materiales: {
    icon: "🔬",
    code: "MAT-205",
    description: "Ciencia e Ingeniería de Materiales · Estructuras cristalinas, diagramas de fase, ensayos de tensión y dureza.",
  },
  "dibujo asistido por computador": {
    icon: "🖥️",
    code: "CAD-102",
    description: "Dibujo Asistido por Computador (CAD) · Modelado paramétrico 3D, ensambles, vistas normalizadas e instrumentos (calibrador).",
  },
  "ondas y particulas": {
    icon: "🌊",
    code: "FIS-201",
    description: "Física de Ondas y Partículas · Movimiento armónico simple, ondas mecánicas, acústica, óptica y física moderna.",
  },
  "laboratorio de ondas y particulas": {
    icon: "🧪",
    code: "LAB-201",
    description: "Laboratorio Experimental de Ondas · Toma de datos de oscilaciones, cálculo de frecuencias y redacción de informes.",
  },
  "estadistica inferencial y muestreo": {
    icon: "📊",
    code: "EST-203",
    description: "Estadística Inferencial · Distribuciones muestrales, intervalos de confianza, pruebas de hipótesis y regresión.",
  },
};

const DEFAULT_PROFESSOR_MAP: Record<string, string> = {
  materiales: "sebastian roa prada",
  "dibujo asistido por computador": "juan manuel arguello espinosa",
  "laboratorio de ondas y particulas": "raul ortiz",
  "ondas y particulas": "christian sarmiento",
  "ecuaciones diferenciales": "leidy johanna gonzalez cely",
  calculo: "profesor de calculo",
  mecanismos: "profesor de mecanismos",
  "circuitos electricos": "profesor de circuitos",
};

const INITIAL_STATE: AcademicActionState = { ok: true, message: "" };

export function AcademicOnboarding({
  subjects,
  professors,
  sections,
  membershipSectionIds,
  currentTermKey,
}: Props) {
  const router = useRouter();
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(() => membershipSectionIds.length === 0);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedCareer, setSelectedCareer] = useState<string>("mecatronica");
  const [configMode, setConfigMode] = useState<"tema_sync" | "manual">("tema_sync");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [subjectProfessorMap, setSubjectProfessorMap] = useState<Record<string, string>>({});

  // Formulario TEMA Connection
  const [temaUsername, setTemaUsername] = useState("dmonoga");
  const [temaPassword, setTemaPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [temaConnecting, setTemaConnecting] = useState(false);
  const [temaStatusMessage, setTemaStatusMessage] = useState<string | null>(null);
  const [temaSyncSuccess, setTemaSyncSuccess] = useState(false);

  const [showAddSubjectForm, setShowAddSubjectForm] = useState(false);
  const [showAddProfessorForm, setShowAddProfessorForm] = useState(false);
  const [targetSubjectForNewProf, setTargetSubjectForNewProf] = useState<string | null>(null);

  // Estados colaborativos de edición y sugerencias comunitarias de profesores
  const [customProfessorNames, setCustomProfessorNames] = useState<Record<string, string>>({});
  const [communitySuggestions, setCommunitySuggestions] = useState<Record<string, string>>({
    "ecuaciones diferenciales": "Leidy Johanna González Cely",
    materiales: "Sebastián Roa Prada",
    "dibujo asistido por computador": "Juan Manuel Argüello Espinosa",
    "ondas y particulas": "Christian Sarmiento",
    "laboratorio de ondas y particulas": "Raúl Ortiz",
    mecanismos: "Prof. Departamento de Mecatrónica",
    "dinamica de la ingenieria": "Prof. Seminario de Ingeniería",
    calculo: "Prof. Área de Ciencias Básicas",
    "circuitos electricos": "Prof. Área de Electrónica",
  });
  const [editingProfSubjectId, setEditingProfSubjectId] = useState<string | null>(null);
  const [tempProfName, setTempProfName] = useState("");

  const [batchPending, startBatchTransition] = useTransition();
  const [batchMessage, setBatchMessage] = useState<string | null>(null);

  const [subjectState, createSubjectAction, isPendingSubject] = useActionState(
    async (_prev: AcademicActionState, formData: FormData) => findOrCreateCatalogEntry(formData),
    INITIAL_STATE
  );
  const [professorState, createProfessorAction, isPendingProfessor] = useActionState(
    async (_prev: AcademicActionState, formData: FormData) => findOrCreateCatalogEntry(formData),
    INITIAL_STATE
  );
  const [leaveState, leaveAction, isPendingLeave] = useActionState(
    async (_prev: AcademicActionState, formData: FormData) => leaveSectionAction(formData),
    INITIAL_STATE
  );
  const [joinState, joinAction, isPendingJoin] = useActionState(
    async (_prev: AcademicActionState, formData: FormData) => joinSectionAction(formData),
    INITIAL_STATE
  );

  // Desduplicar catálogo de materias por normalized_key
  const deduplicatedSubjects = useMemo(() => {
    const seen = new Set<string>();
    const result: CatalogItem[] = [];
    for (const subj of subjects) {
      const key = subj.normalized_key || normalizeCatalogKey(subj.display_name);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(subj);
      }
    }
    return result;
  }, [subjects]);

  // Desduplicar catálogo de profesores por normalized_key
  const deduplicatedProfessors = useMemo(() => {
    const seen = new Set<string>();
    const result: CatalogItem[] = [];
    for (const prof of professors) {
      const key = prof.normalized_key || normalizeCatalogKey(prof.display_name);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(prof);
      }
    }
    return result;
  }, [professors]);

  // Auto-seleccionar materias según el programa elegido al cambiar carrera
  const activeProgram = useMemo(
    () => CAREER_PROGRAMS.find((p) => p.id === selectedCareer) || CAREER_PROGRAMS[0],
    [selectedCareer]
  );

  // Filtrar materias por carrera y búsqueda
  const filteredSubjects = useMemo(() => {
    const query = normalizeCatalogKey(subjectSearch);
    let list = deduplicatedSubjects;

    if (activeProgram) {
      list = list.filter((s) => activeProgram.subjectKeys.includes(s.normalized_key));
    }

    if (query) {
      list = list.filter((s) => s.normalized_key.includes(query) || s.display_name.toLowerCase().includes(query));
    }

    return list;
  }, [deduplicatedSubjects, activeProgram, subjectSearch]);

  // Obtener el nombre del docente que se mostrará para cada materia
  const getProfessorDisplayName = (subjectId: string) => {
    if (customProfessorNames[subjectId]) return customProfessorNames[subjectId];
    const subj = deduplicatedSubjects.find((s) => s.id === subjectId);
    if (subj) {
      if (communitySuggestions[subj.normalized_key]) {
        return communitySuggestions[subj.normalized_key];
      }
      const defaultProfKey = DEFAULT_PROFESSOR_MAP[subj.normalized_key];
      if (defaultProfKey) {
        const matched = deduplicatedProfessors.find((p) => p.normalized_key === defaultProfKey);
        if (matched) return matched.display_name;
      }
    }
    const profId = subjectProfessorMap[subjectId];
    const prof = deduplicatedProfessors.find((p) => p.id === profId);
    if (prof) return prof.display_name;
    return "Docente de Cátedra";
  };

  // Quitar/deseleccionar materia
  const removeSubject = (subjectId: string) => {
    setSelectedSubjectIds((prev) => prev.filter((id) => id !== subjectId));
  };

  // Guardar nombre personalizado de profesor y actualizar sugerencias comunitarias
  const handleSaveCustomProfessor = (subjectId: string) => {
    const trimmed = tempProfName.trim();
    if (trimmed) {
      setCustomProfessorNames((prev) => ({ ...prev, [subjectId]: trimmed }));
      const subj = deduplicatedSubjects.find((s) => s.id === subjectId);
      if (subj) {
        setCommunitySuggestions((prev) => ({ ...prev, [subj.normalized_key]: trimmed }));
      }
    }
    setEditingProfSubjectId(null);
    setTempProfName("");
  };

  // Aplicar sugerencia comunitaria reciente
  const handleApplyCommunitySuggestion = (subjectId: string, suggestion: string) => {
    setCustomProfessorNames((prev) => ({ ...prev, [subjectId]: suggestion }));
  };

  // Toggle selección múltiple de materia
  const toggleSubject = (subjectId: string) => {
    setSelectedSubjectIds((prev) => {
      const exists = prev.includes(subjectId);
      const updated = exists ? prev.filter((id) => id !== subjectId) : [...prev, subjectId];

      if (!exists && !subjectProfessorMap[subjectId]) {
        const subj = deduplicatedSubjects.find((s) => s.id === subjectId);
        if (subj) {
          const defaultProfKey = DEFAULT_PROFESSOR_MAP[subj.normalized_key];
          const matchedProf = defaultProfKey
            ? deduplicatedProfessors.find((p) => p.normalized_key === defaultProfKey)
            : deduplicatedProfessors[0];

          if (matchedProf) {
            setSubjectProfessorMap((m) => ({ ...m, [subjectId]: matchedProf.id }));
          }
        }
      }
      return updated;
    });
  };

  // Seleccionar todas las materias de la carrera seleccionada
  const selectAllProgramSubjects = () => {
    const ids = filteredSubjects.map((s) => s.id);
    setSelectedSubjectIds(ids);

    const map: Record<string, string> = { ...subjectProfessorMap };
    for (const subj of filteredSubjects) {
      if (!map[subj.id]) {
        const defaultProfKey = DEFAULT_PROFESSOR_MAP[subj.normalized_key];
        const matchedProf = defaultProfKey
          ? deduplicatedProfessors.find((p) => p.normalized_key === defaultProfKey)
          : deduplicatedProfessors[0];
        if (matchedProf) map[subj.id] = matchedProf.id;
      }
    }
    setSubjectProfessorMap(map);
  };

  // Asignar profesor a una materia seleccionada
  const setProfessorForSubject = (subjectId: string, profId: string) => {
    setSubjectProfessorMap((prev) => ({ ...prev, [subjectId]: profId }));
  };

  // Conectar con TEMA Moodle
  const handleTemaConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!temaUsername || !temaPassword) {
      setTemaStatusMessage("Por favor ingresa tu usuario y contraseña de TEMA.");
      return;
    }

    setTemaConnecting(true);
    setTemaStatusMessage("Conectando con el servidor TEMA Moodle de la UNAB...");

    try {
      const res = await fetch("/api/tema/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: temaUsername, password: temaPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTemaStatusMessage(data.error || "No se pudo conectar con TEMA. Verifica tus credenciales.");
        setTemaConnecting(false);
        return;
      }

      setTemaSyncSuccess(true);
      setTemaStatusMessage("✅ Conexión con TEMA exitosa. Materias y notas sincronizadas correctamente.");
      selectAllProgramSubjects();
      setTemaConnecting(false);
      
      // Auto avanzar al resumen
      setTimeout(() => {
        setCurrentStep(3);
      }, 1200);
    } catch {
      setTemaStatusMessage("Error al comunicarse con el servidor. Intenta de nuevo.");
      setTemaConnecting(false);
    }
  };

  // Matricular todas las materias seleccionadas
  const handleBulkEnroll = () => {
    if (selectedSubjectIds.length === 0) {
      setBatchMessage("Debes seleccionar al menos una materia para inscribirte.");
      return;
    }

    startBatchTransition(async () => {
      const enrollments = selectedSubjectIds.map((subjectId) => {
        const customName = customProfessorNames[subjectId];
        const assignedProfId = subjectProfessorMap[subjectId];
        const assignedProf = deduplicatedProfessors.find((p) => p.id === assignedProfId);
        const subj = deduplicatedSubjects.find((s) => s.id === subjectId);
        return {
          subjectId,
          subjectName: subj?.display_name || "",
          professorId: assignedProfId || "",
          professorName: customName || assignedProf?.display_name || "Docente Titular",
          term: currentTermKey,
        };
      });

      const res = await enrollInMultipleSubjects(enrollments);
      if (res.ok) {
        setBatchMessage(res.message);
        router.refresh();
        router.push("/materias");
      } else {
        setBatchMessage(res.message || "Ocurrió un error al inscribir las materias.");
      }
    });
  };

  // Grupos en los que el estudiante ya está inscrito
  const joinedSections = useMemo(() => {
    return sections.filter((s) => membershipSectionIds.includes(s.id));
  }, [sections, membershipSectionIds]);

  const getSubjectNameForSection = (sec: SectionItem) => {
    if (sec.subjects?.display_name && sec.subjects.display_name !== "Materia") return sec.subjects.display_name;
    const match = deduplicatedSubjects.find((s) => s.id === sec.subject_id);
    if (match?.display_name) return match.display_name;
    return "Materia UNAB";
  };

  const getProfessorNameForSection = (sec: SectionItem) => {
    if (sec.professors?.display_name && sec.professors.display_name !== "Profesor") return sec.professors.display_name;
    const match = deduplicatedProfessors.find((p) => p.id === sec.professor_id);
    if (match?.display_name) return match.display_name;
    const subjMatch = deduplicatedSubjects.find((s) => s.id === sec.subject_id);
    if (subjMatch && communitySuggestions[subjMatch.normalized_key]) {
      return communitySuggestions[subjMatch.normalized_key];
    }
    if (subjMatch && DEFAULT_PROFESSOR_MAP[subjMatch.normalized_key]) {
      const defaultProf = deduplicatedProfessors.find((p) => p.normalized_key === DEFAULT_PROFESSOR_MAP[subjMatch.normalized_key]);
      if (defaultProf) return defaultProf.display_name;
    }
    return "Docente Titular";
  };

  return (
    <div className="academic-onboarding">
      {/* HEADER DE GRUPOS ACTIVOS */}
      {joinedSections.length > 0 && (
        <section className="academic-joined-section" aria-labelledby="joined-title">
          <div className="academic-card-top">
            <div>
              <h3 id="joined-title">Tus Materias Activas ({joinedSections.length})</h3>
              <p>Ya estás inscrito en estos espacios de colaboración para el período {currentTermKey}.</p>
            </div>
            <Link href="/dashboard" className="academic-btn academic-btn-primary academic-btn-sm">
              Ir al Dashboard ➔
            </Link>
          </div>

          <div className="academic-joined-grid">
            {joinedSections.map((sec) => (
              <div key={sec.id} className="academic-joined-card">
                <div className="academic-joined-info">
                  <strong>{getSubjectNameForSection(sec)}</strong>
                  <span>Prof. {getProfessorNameForSection(sec)}</span>
                </div>
                <div className="academic-joined-actions">
                  <Link href={`/section/${sec.id}`} className="academic-btn academic-btn-outline academic-btn-sm">
                    Abrir Espacio
                  </Link>
                  <form action={leaveAction}>
                    <input type="hidden" name="sectionId" value={sec.id} />
                    <button
                      type="submit"
                      disabled={isPendingLeave}
                      className="academic-leave-btn"
                      title="Darme de baja de este grupo"
                    >
                      {isPendingLeave ? "Saliendo..." : "✕ Salir"}
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
          {!leaveState.ok && <p className="academic-error-text">{leaveState.message}</p>}

          <div style={{ marginTop: "18px", display: "flex", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => setIsWizardOpen(!isWizardOpen)}
              className="academic-btn academic-btn-secondary"
              style={{ padding: "8px 16px", fontSize: "12px", cursor: "pointer" }}
            >
              {isWizardOpen ? "▲ Ocultar asistente de inscripción" : "➕ Agregar o modificar materias (Desplegar asistente)"}
            </button>
          </div>
        </section>
      )}

      {/* PROGRESS BAR DEL CARRUSEL / WIZARD */}
      {isWizardOpen && (
        <>
          <div className="academic-stepper-bar">
        <div
          className={`academic-step-node ${currentStep >= 1 ? "active" : ""} ${currentStep > 1 ? "done" : ""}`}
          onClick={() => setCurrentStep(1)}
        >
          <div className="academic-step-icon">{currentStep > 1 ? "✓" : "1"}</div>
          <div className="academic-step-text">
            <strong>Paso 1: Tu Carrera</strong>
            <span>Selecciona tu programa</span>
          </div>
        </div>

        <div className="academic-step-line" />

        <div
          className={`academic-step-node ${currentStep >= 2 ? "active" : ""} ${currentStep > 2 ? "done" : ""}`}
          onClick={() => setCurrentStep(2)}
        >
          <div className="academic-step-icon">{currentStep > 2 ? "✓" : "2"}</div>
          <div className="academic-step-text">
            <strong>Paso 2: Método & Materias</strong>
            <span>TEMA Beta o Manual</span>
          </div>
        </div>

        <div className="academic-step-line" />

        <div className={`academic-step-node ${currentStep === 3 ? "active" : ""}`}>
          <div className="academic-step-icon">3</div>
          <div className="academic-step-text">
            <strong>Paso 3: Confirmación</strong>
            <span>Resumen e ingreso</span>
          </div>
        </div>
      </div>

      {batchMessage && <div className="academic-alert-banner">{batchMessage}</div>}

      {/* PASO 1: SELECCIONA TU PROGRAMA DE INGENIERÍA */}
      {currentStep === 1 && (
        <section className="academic-wizard-card" aria-labelledby="step1-title">
          <div className="academic-wizard-header">
            <span className="academic-kicker">Configuración Académica · UNAB OS</span>
            <h2 id="step1-title">Paso 1: Selecciona tu Programa de Ingeniería</h2>
            <p>Elige tu carrera para cargar automáticamente el plan de estudio y materias sugeridas.</p>
          </div>

          <div className="academic-career-grid">
            {CAREER_PROGRAMS.map((prog) => {
              const isSelected = selectedCareer === prog.id;
              return (
                <div
                  key={prog.id}
                  className={`academic-career-card ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelectedCareer(prog.id)}
                >
                  <div className="academic-career-top">
                    <span className="academic-career-icon">{prog.icon}</span>
                    <span className="academic-career-badge">{prog.badge}</span>
                  </div>
                  <h3 className="academic-career-title">{prog.title}</h3>
                  <p className="academic-career-desc">{prog.description}</p>
                  <div className="academic-career-footer">
                    <span className="academic-career-duration">⏱️ {prog.duration}</span>
                    <div className={`academic-radio-indicator ${isSelected ? "active" : ""}`}>
                      {isSelected ? "✓" : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="academic-wizard-footer">
            <div className="academic-wizard-footer-hint">
              <span>Programa activo: <strong>{activeProgram.title}</strong></span>
            </div>
            <button
              type="button"
              className="academic-btn academic-btn-primary academic-btn-lg"
              onClick={() => {
                selectAllProgramSubjects();
                setCurrentStep(2);
              }}
            >
              Continuar al Paso 2: Método de Materias ➔
            </button>
          </div>
        </section>
      )}

      {/* PASO 2: ELEGIR MÉTODO (TEMA SYNC BETA VS SELECCIÓN MANUAL) */}
      {currentStep === 2 && (
        <section className="academic-wizard-card" aria-labelledby="step2-title">
          <div className="academic-wizard-header">
            <button type="button" className="academic-back-link" onClick={() => setCurrentStep(1)}>
              ← Cambiar carrera ({activeProgram.title})
            </button>
            <h2 id="step2-title">Paso 2: Configura tus Materias</h2>
            <p>¿Cómo prefieres añadir tus materias para el semestre actual?</p>
          </div>

          {/* SELECTOR DE MODO */}
          <div className="academic-mode-selector-grid">
            <div
              className={`academic-mode-card ${configMode === "tema_sync" ? "selected" : ""}`}
              onClick={() => setConfigMode("tema_sync")}
            >
              <div className="academic-mode-icon">⚡</div>
              <div className="academic-mode-content">
                <div className="academic-mode-title-row">
                  <strong>Sincronización Automática con TEMA (Moodle UNAB)</strong>
                  <span className="academic-beta-pill">Recomendado · Beta</span>
                </div>
                <p>
                  Conecta tu cuenta institucional para extraer automáticamente tus materias inscritas, profesores,
                  tareas y notas reales sin ingresarlas manualmente.
                </p>
              </div>
            </div>

            <div
              className={`academic-mode-card ${configMode === "manual" ? "selected" : ""}`}
              onClick={() => setConfigMode("manual")}
            >
              <div className="academic-mode-icon">📝</div>
              <div className="academic-mode-content">
                <div className="academic-mode-title-row">
                  <strong>Selección Manual Asistida</strong>
                  <span className="academic-tag-pill">Personalizado</span>
                </div>
                <p>
                  Elige tus materias en 1 click de la lista de {activeProgram.title}, confirma o cambia profesores y crea
                  nuevos grupos de estudio.
                </p>
              </div>
            </div>
          </div>

          {/* MODO A: SINCRONIZACIÓN TEMA MOODLE */}
          {configMode === "tema_sync" && (
            <div className="academic-tema-sync-box">
              <div className="academic-tema-sync-header">
                <h3>⚡ Conexión Directa con TEMA Moodle UNAB</h3>
                <p>Ingresa tu usuario institucional de TEMA (e.g. <code>dmonoga</code>) y tu contraseña del portal.</p>
              </div>

              <form onSubmit={handleTemaConnect} className="academic-tema-form">
                <div className="academic-tema-form-row">
                  <div className="academic-form-field">
                    <label htmlFor="tema-user">Usuario de TEMA / UNAB</label>
                    <input
                      id="tema-user"
                      type="text"
                      value={temaUsername}
                      onChange={(e) => setTemaUsername(e.target.value)}
                      placeholder="e.g. dmonoga (sin @unab.edu.co)"
                      required
                    />
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-subtle)", marginTop: "4px" }}>
                      💡 Ingresa únicamente el usuario corto (sin @unab.edu.co).
                    </span>
                  </div>

                  <div className="academic-form-field">
                    <label htmlFor="tema-pass">Contraseña de TEMA</label>
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <input
                        id="tema-pass"
                        type={showPassword ? "text" : "password"}
                        value={temaPassword}
                        onChange={(e) => setTemaPassword(e.target.value)}
                        placeholder="Contraseña del portal"
                        style={{ paddingRight: "40px", width: "100%" }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute",
                          right: "10px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "14px",
                          opacity: 0.7,
                        }}
                        title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                        aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                      >
                        {showPassword ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="academic-tema-form-actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    type="submit"
                    disabled={temaConnecting}
                    className="academic-btn academic-btn-primary academic-btn-lg"
                  >
                    {temaConnecting ? "⚡ Sincronizando con TEMA UNAB..." : "⚡ Sincronizar Materias y Notas"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfigMode("manual")}
                    className="academic-btn academic-btn-outline"
                  >
                    Omitir sincronización y seleccionar manualmente ➔
                  </button>
                </div>

                {temaStatusMessage && (
                  <p className={`academic-tema-status ${temaSyncSuccess ? "success" : "warning"}`}>
                    {temaStatusMessage}
                  </p>
                )}
              </form>
            </div>
          )}

          {/* MODO B: SELECCIÓN MANUAL ASISTIDA */}
          {configMode === "manual" && (
            <div className="academic-manual-selection-box">
              <div className="academic-search-and-actions">
                <div className="academic-search-input-wrap">
                  <svg className="academic-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    className="academic-search-bar"
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    placeholder="Buscar materia por nombre o código (e.g. Cálculo, Mecanismos)..."
                  />
                </div>

                <button
                  type="button"
                  className="academic-btn academic-btn-outline"
                  onClick={selectAllProgramSubjects}
                >
                  ✓ Seleccionar todas ({filteredSubjects.length})
                </button>
              </div>

              {/* GRID DE MATERIAS CON CHECKBOX */}
              <div className="academic-subjects-grid">
                {filteredSubjects.map((subj) => {
                  const isSelected = selectedSubjectIds.includes(subj.id);
                  const meta = SUBJECT_METADATA[subj.normalized_key] || {
                    icon: "📘",
                    code: "UNAB",
                    description: "Materia curricular oficial de ingeniería.",
                  };
                  const selectedProfId = subjectProfessorMap[subj.id] || deduplicatedProfessors[0]?.id;
                  const displayedProfName = getProfessorDisplayName(subj.id);
                  const suggestion = communitySuggestions[subj.normalized_key];
                  const hasDifferentSuggestion = suggestion && suggestion !== displayedProfName;
                  const isEditingThisProf = editingProfSubjectId === subj.id;

                  return (
                    <div
                      key={subj.id}
                      className={`academic-subject-card ${isSelected ? "selected" : ""}`}
                      onClick={() => toggleSubject(subj.id)}
                    >
                      <div className="academic-checkbox-circle">
                        {isSelected ? "✓" : ""}
                      </div>

                      <div className="academic-subject-info">
                        <div className="academic-subject-header-row">
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <span className="academic-subject-code">{meta.code}</span>
                            <span className="academic-group-badge">👥 Grupo Compartido</span>
                          </div>
                          <span className="academic-subject-icon-meta">{meta.icon}</span>
                        </div>
                        <strong className="academic-subject-title">{subj.display_name}</strong>
                        <p className="academic-subject-desc">{meta.description}</p>

                        {/* SELECTOR Y EDICIÓN DE PROFESOR ASOCIADO */}
                        {isSelected && (
                          <div
                            className="academic-subject-prof-row"
                            onClick={(e) => e.stopPropagation()}
                            style={{ flexDirection: "column", alignItems: "stretch", gap: "8px" }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                              <span style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
                                Docente: <strong style={{ color: "var(--color-text)" }}>{displayedProfName}</strong>
                              </span>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  type="button"
                                  className="academic-edit-prof-btn"
                                  onClick={() => {
                                    setEditingProfSubjectId(isEditingThisProf ? null : subj.id);
                                    setTempProfName(displayedProfName);
                                  }}
                                >
                                  ✏️ Editar Docente
                                </button>
                                <button
                                  type="button"
                                  className="academic-remove-subject-btn"
                                  onClick={() => removeSubject(subj.id)}
                                  title="Quitar materia de mi lista"
                                >
                                  ✕ Deseleccionar
                                </button>
                              </div>
                            </div>

                            {/* EDITOR INLINE DE DOCENTE */}
                            {isEditingThisProf && (
                              <div className="academic-inline-edit-box">
                                <input
                                  type="text"
                                  className="academic-inline-edit-input"
                                  value={tempProfName}
                                  onChange={(e) => setTempProfName(e.target.value)}
                                  placeholder="Escribe el nombre del docente..."
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  className="academic-btn academic-btn-primary academic-btn-sm"
                                  onClick={() => handleSaveCustomProfessor(subj.id)}
                                >
                                  Guardar
                                </button>
                                <button
                                  type="button"
                                  className="academic-btn academic-btn-outline academic-btn-sm"
                                  onClick={() => setEditingProfSubjectId(null)}
                                >
                                  Cancelar
                                </button>
                              </div>
                            )}

                            {/* ALERTA COLABORATIVA DE SUGERENCIA COMUNITARIA */}
                            {hasDifferentSuggestion && (
                              <div className="academic-community-badge">
                                <span>
                                  💡 Últimamente tus compañeros le han cambiado el nombre a: <strong>&quot;{suggestion}&quot;</strong>
                                </span>
                                <button
                                  type="button"
                                  className="academic-apply-suggestion-btn"
                                  onClick={() => handleApplyCommunitySuggestion(subj.id, suggestion)}
                                >
                                  ✓ Aplicar sugerencia
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ACCIONES PARA CREAR NUEVA MATERIA O PROFESOR */}
              <div className="academic-add-custom-links">
                <button
                  type="button"
                  className="academic-text-btn"
                  onClick={() => setShowAddSubjectForm(!showAddSubjectForm)}
                >
                  ＋ ¿No encuentras una materia? Confirmar nueva materia
                </button>
                <button
                  type="button"
                  className="academic-text-btn"
                  onClick={() => setShowAddProfessorForm(!showAddProfessorForm)}
                >
                  ＋ Crear grupo con profesor no listado
                </button>
              </div>

              {/* MODAL CREAR MATERIA */}
              {showAddSubjectForm && (
                <div className="academic-modal-box">
                  <h4>Confirmar nueva materia en el catálogo</h4>
                  <form action={createSubjectAction} className="academic-inline-form">
                    <input type="hidden" name="entryType" value="subject" />
                    <input
                      name="displayName"
                      className="academic-form-input"
                      placeholder="Nombre de la nueva materia (e.g. Robótica Móvil)"
                      required
                    />
                    <div className="academic-form-actions">
                      <button type="submit" disabled={isPendingSubject} className="academic-btn academic-btn-primary">
                        {isPendingSubject ? "Guardando..." : "Guardar Materia"}
                      </button>
                      <button
                        type="button"
                        className="academic-btn academic-btn-outline"
                        onClick={() => setShowAddSubjectForm(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                    {!subjectState.ok && <p className="academic-error-text">{subjectState.message}</p>}
                  </form>
                </div>
              )}

              {/* MODAL CREAR PROFESOR */}
              {showAddProfessorForm && (
                <div className="academic-modal-box">
                  <h4>Crear grupo con profesor</h4>
                  <form action={createProfessorAction} className="academic-inline-form">
                    <input type="hidden" name="entryType" value="professor" />
                    <input
                      name="displayName"
                      className="academic-form-input"
                      placeholder="Nombre completo del profesor"
                      required
                    />
                    <div className="academic-form-actions">
                      <button type="submit" disabled={isPendingProfessor} className="academic-btn academic-btn-primary">
                        {isPendingProfessor ? "Guardando..." : "Guardar Profesor"}
                      </button>
                      <button
                        type="button"
                        className="academic-btn academic-btn-outline"
                        onClick={() => setShowAddProfessorForm(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                    {!professorState.ok && <p className="academic-error-text">{professorState.message}</p>}
                  </form>
                </div>
              )}
            </div>
          )}

          <div className="academic-wizard-footer">
            <button
              type="button"
              className="academic-btn academic-btn-outline"
              onClick={() => setCurrentStep(1)}
            >
              ← Atrás (Carrera)
            </button>

            <button
              type="button"
              className="academic-btn academic-btn-primary academic-btn-lg"
              onClick={() => setCurrentStep(3)}
            >
              Siguiente: Confirmar Resumen ({selectedSubjectIds.length} materias) ➔
            </button>
          </div>
        </section>
      )}

      {/* PASO 3: RESUMEN FINAL Y MATRÍCULA CONJUNTA */}
      {currentStep === 3 && (
        <section className="academic-wizard-card" aria-labelledby="step3-title">
          <div className="academic-wizard-header">
            <button
              type="button"
              className="academic-back-link"
              onClick={() => setCurrentStep(2)}
            >
              ← Modificar materias seleccionadas
            </button>
            <h2 id="step3-title">Paso 3: Confirmar e Ingresar a tus Grupos</h2>
            <p>Revisa la lista de materias que quedarán activas en tu espacio de estudio para {activeProgram.title}. Puedes editar docentes o quitar materias antes de finalizar.</p>
          </div>

          <div className="academic-confirmation-table-wrap">
            <table className="academic-confirmation-table">
              <thead>
                <tr>
                  <th>Materia</th>
                  <th>Profesor Asignado</th>
                  <th>Período</th>
                  <th>Compañeros</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {selectedSubjectIds.map((subjectId) => {
                  const subj = deduplicatedSubjects.find((s) => s.id === subjectId);
                  const displayedProfName = getProfessorDisplayName(subjectId);
                  const meta = subj ? SUBJECT_METADATA[subj.normalized_key] : null;
                  const suggestion = subj ? communitySuggestions[subj.normalized_key] : null;
                  const hasDifferentSuggestion = suggestion && suggestion !== displayedProfName;
                  const isEditingThisProf = editingProfSubjectId === subjectId;

                  return (
                    <tr key={subjectId}>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <strong>{meta?.icon ?? "📘"} {subj?.display_name}</strong>
                          {meta?.code && <span className="academic-table-subcode">{meta.code}</span>}
                        </div>
                      </td>
                      <td>
                        {isEditingThisProf ? (
                          <div className="academic-inline-edit-box">
                            <input
                              type="text"
                              className="academic-inline-edit-input"
                              value={tempProfName}
                              onChange={(e) => setTempProfName(e.target.value)}
                              autoFocus
                            />
                            <button
                              type="button"
                              className="academic-btn academic-btn-primary academic-btn-sm"
                              onClick={() => handleSaveCustomProfessor(subjectId)}
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              className="academic-btn academic-btn-outline academic-btn-sm"
                              onClick={() => setEditingProfSubjectId(null)}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span>👨‍🏫 {displayedProfName}</span>
                              <button
                                type="button"
                                className="academic-edit-prof-btn"
                                style={{ padding: "2px 6px", fontSize: "11px" }}
                                onClick={() => {
                                  setEditingProfSubjectId(subjectId);
                                  setTempProfName(displayedProfName);
                                }}
                                title="Editar nombre del docente"
                              >
                                ✏️
                              </button>
                            </div>
                            {hasDifferentSuggestion && (
                              <div className="academic-community-badge" style={{ margin: "2px 0 0 0", padding: "4px 8px", fontSize: "11px" }}>
                                <span>💡 Sugerencia: <strong>{suggestion}</strong></span>
                                <button
                                  type="button"
                                  className="academic-apply-suggestion-btn"
                                  style={{ padding: "2px 6px", fontSize: "10px" }}
                                  onClick={() => handleApplyCommunitySuggestion(subjectId, suggestion)}
                                >
                                  Usar
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td><span className="academic-term-pill">{currentTermKey}</span></td>
                      <td><span className="academic-group-badge">👥 Grupo Compartido</span></td>
                      <td>
                        <button
                          type="button"
                          className="academic-remove-subject-btn"
                          onClick={() => removeSubject(subjectId)}
                          title="Quitar de la lista"
                        >
                          ✕ Quitar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="academic-confirm-actions-box">
            <form action={joinAction} style={{ display: "none" }}>
              <input type="hidden" name="sectionId" value="" />
            </form>
            <button
              type="button"
              disabled={batchPending || selectedSubjectIds.length === 0}
              className="academic-btn academic-btn-primary academic-btn-xl"
              onClick={handleBulkEnroll}
            >
              {batchPending ? "Inscribiendo materias..." : `🎉 Confirmar e Inscribir (${selectedSubjectIds.length} materias)`}
            </button>
          </div>

          <div className="academic-wizard-footer">
            <button
              type="button"
              className="academic-btn academic-btn-outline"
              onClick={() => setCurrentStep(2)}
            >
              ← Modificar selección
            </button>
          </div>
          </section>
        )}
      </>
    )}
  </div>
);
}
