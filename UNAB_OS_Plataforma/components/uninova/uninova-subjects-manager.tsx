"use client";

import React, { useState, useMemo, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  findOrCreateCatalogEntry,
  enrollInMultipleSubjects,
  joinSection as joinSectionAction,
  leaveSection as leaveSectionAction,
} from "@/app/actions/academic-collaboration";
import { normalizeCatalogKey } from "@/lib/domain/academic-collaboration";

export type CatalogItem = { id: string; display_name: string; normalized_key: string };
export type SectionItem = {
  id: string;
  subject_id: string;
  professor_id: string;
  term: string;
  subjects?: { display_name?: string | null } | null;
  professors?: { display_name?: string | null } | null;
};

interface UniNovaSubjectsManagerProps {
  subjects: CatalogItem[];
  professors: CatalogItem[];
  sections: SectionItem[];
  membershipSectionIds: string[];
  currentTermKey: string;
  userEmail?: string;
  userName?: string;
}

interface SubjectCardData {
  id: string;
  displayName: string;
  normalizedKey: string;
  code: string;
  icon: string;
  category: string;
  professorName: string;
  isEnrolled: boolean;
  sectionId?: string;
  peersCount: number;
  peers: string[];
}

const CANONICAL_MECATRONICA_METADATA: Record<
  string,
  { icon: string; code: string; category: string; defaultProf: string }
> = {
  "dinamica y mecanismos": {
    icon: "⚙️",
    code: "MEC-302",
    category: "Mecatrónica / Cinemática",
    defaultProf: "Ing. Hernán Ospina",
  },
  mecanismos: {
    icon: "⚙️",
    code: "MEC-302",
    category: "Mecatrónica / Cinemática",
    defaultProf: "Ing. Hernán Ospina",
  },
  "circuitos electricos": {
    icon: "⚡",
    code: "CIR-301",
    category: "Electrónica / Circuitos",
    defaultProf: "Ing. Ricardo Duarte",
  },
  "calculo multivariable & edo": {
    icon: "📐",
    code: "MAT-202",
    category: "Ciencias Básicas / Matemáticas",
    defaultProf: "Dra. Leidy Johanna González",
  },
  calculo: {
    icon: "📘",
    code: "MAT-101",
    category: "Ciencias Básicas / Matemáticas",
    defaultProf: "Prof. Área de Ciencias Básicas",
  },
  "ecuaciones diferenciales": {
    icon: "📐",
    code: "MAT-202",
    category: "Ciencias Básicas / Matemáticas",
    defaultProf: "Dra. Leidy Johanna González",
  },
  "ciencia de materiales": {
    icon: "🔬",
    code: "MAT-205",
    category: "Materiales & Manufactura",
    defaultProf: "Dra. Martha Cecilia Jaimes",
  },
  materiales: {
    icon: "🔬",
    code: "MAT-205",
    category: "Materiales & Manufactura",
    defaultProf: "Dra. Martha Cecilia Jaimes",
  },
  "fisica: ondas": {
    icon: "🌊",
    code: "FIS-201",
    category: "Física Experimental",
    defaultProf: "Dr. Christian Sarmiento",
  },
  "ondas y particulas": {
    icon: "🌊",
    code: "FIS-201",
    category: "Física Experimental",
    defaultProf: "Dr. Christian Sarmiento",
  },
  "estadistica inferencial": {
    icon: "📊",
    code: "EST-203",
    category: "Modelos Probabilísticos",
    defaultProf: "Prof. Área de Estadística",
  },
  "estadistica inferencial y muestreo": {
    icon: "📊",
    code: "EST-203",
    category: "Modelos Probabilísticos",
    defaultProf: "Prof. Área de Estadística",
  },
  "dibujo asistido por computador": {
    icon: "🖥️",
    code: "CAD-102",
    category: "Modelado Paramétrico 3D",
    defaultProf: "Ing. Juan Manuel Argüello",
  },
  "laboratorio de ondas y particulas": {
    icon: "🧪",
    code: "LAB-201",
    category: "Laboratorio Experimental",
    defaultProf: "Dr. Raúl Ortiz",
  },
};

export function UniNovaSubjectsManager({
  subjects: initialSubjects,
  professors,
  sections,
  membershipSectionIds,
  currentTermKey,
  userEmail = "user1@example.edu",
  userName = "Estudiante UNAB",
}: UniNovaSubjectsManagerProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "enrolled" | "available">("all");
  const [isPending, startTransition] = useTransition();
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Active memberships locally synced
  const [enrolledSubjectNames, setEnrolledSubjectNames] = useState<string[]>(() => {
    try {
      const emailKey = userEmail.toLowerCase().trim();
      const localCourses = localStorage.getItem(`uninova_enrolled_courses_${emailKey}`);
      if (localCourses) return JSON.parse(localCourses);
      const generalCourses = localStorage.getItem("uninova_enrolled_subjects");
      if (generalCourses) return JSON.parse(generalCourses);
    } catch {
      // ignore
    }

    const isDaniel = userEmail.toLowerCase().includes("dmonoga");
    if (isDaniel) {
      return [
        "Dinámica y Mecanismos",
        "Circuitos Eléctricos",
        "Cálculo Multivariable & EDO",
        "Ciencia de Materiales",
        "Física: Ondas",
        "Estadística Inferencial",
      ];
    }

    // Default from database memberships
    const dbEnrolled = sections
      .filter((s) => membershipSectionIds.includes(s.id))
      .map((s) => s.subjects?.display_name || "")
      .filter(Boolean);
    return dbEnrolled;
  });

  // Modal Crear Materia
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectProf, setNewSubjectProf] = useState("");
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Sync to localStorage
  const syncLocalEnrolled = (names: string[]) => {
    setEnrolledSubjectNames(names);
    try {
      const emailKey = userEmail.toLowerCase().trim();
      localStorage.setItem(`uninova_enrolled_courses_${emailKey}`, JSON.stringify(names));
      localStorage.setItem("uninova_enrolled_subjects", JSON.stringify(names));
    } catch {
      // ignore
    }
  };

  // Build unified subject cards
  const allCards: SubjectCardData[] = useMemo(() => {
    // 1. Canonical preset list
    const canonicalPresets: Array<{ name: string; key: string }> = [
      { name: "Dinámica y Mecanismos", key: "dinamica y mecanismos" },
      { name: "Circuitos Eléctricos", key: "circuitos electricos" },
      { name: "Cálculo Multivariable & EDO", key: "calculo multivariable & edo" },
      { name: "Ciencia de Materiales", key: "ciencia de materiales" },
      { name: "Física: Ondas", key: "fisica: ondas" },
      { name: "Estadística Inferencial", key: "estadistica inferencial" },
      { name: "Dibujo Asistido por Computador", key: "dibujo asistido por computador" },
      { name: "Laboratorio de Ondas y Partículas", key: "laboratorio de ondas y particulas" },
    ];

    const seenKeys = new Set<string>();
    const list: SubjectCardData[] = [];

    // Add canonical presets
    for (const preset of canonicalPresets) {
      const normKey = normalizeCatalogKey(preset.name);
      seenKeys.add(normKey);
      const meta = CANONICAL_MECATRONICA_METADATA[normKey] || {
        icon: "📚",
        code: "UNAB-200",
        category: "Ingeniería Mecatrónica",
        defaultProf: "Docente Titular",
      };

      const matchingDbSubject = initialSubjects.find(
        (s) => normalizeCatalogKey(s.display_name) === normKey
      );
      const matchingSection = sections.find(
        (sec) =>
          matchingDbSubject &&
          sec.subject_id === matchingDbSubject.id &&
          sec.term === currentTermKey
      );

      const isEnrolled = enrolledSubjectNames.some(
        (enr) => normalizeCatalogKey(enr) === normKey
      );

      list.push({
        id: matchingDbSubject?.id || `preset-${normKey}`,
        displayName: preset.name,
        normalizedKey: normKey,
        code: meta.code,
        icon: meta.icon,
        category: meta.category,
        professorName: matchingSection?.professors?.display_name || meta.defaultProf,
        isEnrolled,
        sectionId: matchingSection?.id,
        peersCount: 1,
        peers: ["Daniel Monoga"],
      });
    }

    // Add any database subjects that weren't in presets
    for (const dbSub of initialSubjects) {
      const normKey = normalizeCatalogKey(dbSub.display_name);
      if (seenKeys.has(normKey)) continue;
      seenKeys.add(normKey);

      const meta = CANONICAL_MECATRONICA_METADATA[normKey] || {
        icon: "📘",
        code: "ING-300",
        category: "Asignatura Registrada",
        defaultProf: "Docente Titular",
      };

      const matchingSection = sections.find(
        (sec) => sec.subject_id === dbSub.id && sec.term === currentTermKey
      );

      const isEnrolled = enrolledSubjectNames.some(
        (enr) => normalizeCatalogKey(enr) === normKey
      );

      list.push({
        id: dbSub.id,
        displayName: dbSub.display_name,
        normalizedKey: normKey,
        code: meta.code,
        icon: meta.icon,
        category: meta.category,
        professorName: matchingSection?.professors?.display_name || meta.defaultProf,
        isEnrolled,
        sectionId: matchingSection?.id,
        peersCount: 1,
        peers: ["Daniel Monoga"],
      });
    }

    return list;
  }, [initialSubjects, sections, currentTermKey, enrolledSubjectNames]);

  // Filter cards by search & tab
  const filteredCards = useMemo(() => {
    return allCards.filter((card) => {
      const matchesSearch =
        card.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.professorName.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterMode === "enrolled") return card.isEnrolled;
      if (filterMode === "available") return !card.isEnrolled;
      return true;
    });
  }, [allCards, searchQuery, filterMode]);

  const enrolledCount = allCards.filter((c) => c.isEnrolled).length;

  // Toggle subject enrollment
  const handleToggleEnrollment = (card: SubjectCardData) => {
    const willEnroll = !card.isEnrolled;

    startTransition(async () => {
      let updated: string[];
      if (willEnroll) {
        updated = Array.from(new Set([...enrolledSubjectNames, card.displayName]));
        setFeedbackToast(`✅ Te has inscrito en ${card.displayName}`);
      } else {
        updated = enrolledSubjectNames.filter(
          (name) => normalizeCatalogKey(name) !== card.normalizedKey
        );
        setFeedbackToast(`⭕ Te diste de baja de ${card.displayName}`);
      }

      syncLocalEnrolled(updated);

      // Server action sync
      try {
        if (willEnroll) {
          await enrollInMultipleSubjects([
            {
              subjectId: card.id.startsWith("preset-") ? "" : card.id,
              subjectName: card.displayName,
              professorId: "",
              professorName: card.professorName,
              term: currentTermKey,
            },
          ]);
        } else if (card.sectionId) {
          const fd = new FormData();
          fd.append("sectionId", card.sectionId);
          await leaveSectionAction(fd);
        }
      } catch (err) {
        console.warn("Sync error:", err);
      }

      setTimeout(() => setFeedbackToast(null), 3500);
      router.refresh();
    });
  };

  // Check if subject already exists
  const existingMatches = useMemo(() => {
    if (!newSubjectName.trim()) return [];
    const norm = normalizeCatalogKey(newSubjectName);
    return allCards.filter(
      (c) => c.normalizedKey.includes(norm) || norm.includes(c.normalizedKey)
    );
  }, [newSubjectName, allCards]);

  // Handle create subject with verification
  const handleCreateSubjectSubmit = async () => {
    if (!newSubjectName.trim() || !confirmCheckbox) return;

    setCreateLoading(true);
    try {
      const subjectFormData = new FormData();
      subjectFormData.append("kind", "subject");
      subjectFormData.append("displayName", newSubjectName.trim());
      await findOrCreateCatalogEntry(subjectFormData);

      // Enroll automatically
      await enrollInMultipleSubjects([
        {
          subjectId: "",
          subjectName: newSubjectName.trim(),
          professorId: "",
          professorName: newSubjectProf.trim() || "Docente Titular",
          term: currentTermKey,
        },
      ]);

      const updated = Array.from(new Set([...enrolledSubjectNames, newSubjectName.trim()]));
      syncLocalEnrolled(updated);

      setFeedbackToast(`🎉 Asignatura "${newSubjectName.trim()}" creada e inscrita con éxito.`);
      setShowCreateModal(false);
      setCreateStep(1);
      setNewSubjectName("");
      setNewSubjectCode("");
      setNewSubjectProf("");
      setConfirmCheckbox(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      setFeedbackToast("Error al registrar la asignatura. Inténtalo de nuevo.");
    } finally {
      setCreateLoading(false);
      setTimeout(() => setFeedbackToast(null), 4000);
    }
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "28px 20px" }}>
      {/* TOAST FEEDBACK */}
      {feedbackToast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            backgroundColor: "#0f172a",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "10px",
            fontSize: "0.9rem",
            fontWeight: 700,
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span
              style={{
                fontSize: "0.74rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                padding: "3px 10px",
                borderRadius: "14px",
                backgroundColor: "rgba(59, 130, 246, 0.12)",
                color: "#2563eb",
              }}
            >
              Plan Académico · {currentTermKey}
            </span>
            <span
              style={{
                fontSize: "0.74rem",
                fontWeight: 700,
                color: "#64748b",
              }}
            >
              {enrolledCount} de {allCards.length} asignaturas inscritas
            </span>
          </div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "#0f172a",
              margin: 0,
              letterSpacing: "-0.5px",
            }}
          >
            📚 Mis Asignaturas & Matrícula
          </h1>
          <p
            style={{
              margin: "6px 0 0 0",
              fontSize: "0.92rem",
              color: "#64748b",
              maxWidth: "680px",
              lineHeight: 1.5,
            }}
          >
            Selecciona las materias que estás cursando este semestre para activar tus entregas,
            quices y fórmulas en el Tablero de Control de UniNova.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => {
              setShowCreateModal(true);
              setCreateStep(1);
            }}
            className="uninova-btn-primary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              fontSize: "0.88rem",
              fontWeight: 700,
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            <span>➕</span>
            <span>Crear Nueva Materia</span>
          </button>

          <Link
            href="/dashboard"
            className="uninova-btn-secondary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 16px",
              fontSize: "0.88rem",
              fontWeight: 700,
              borderRadius: "8px",
              textDecoration: "none",
            }}
          >
            <span>Tablero Principal ➔</span>
          </Link>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          padding: "14px 18px",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          border: "1px solid rgba(0,0,0,0.08)",
          marginBottom: "20px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`uninova-view-pill ${filterMode === "all" ? "active" : ""}`}
            style={{ fontSize: "0.82rem", padding: "6px 14px", borderRadius: "8px" }}
          >
            Todas ({allCards.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("enrolled")}
            className={`uninova-view-pill ${filterMode === "enrolled" ? "active" : ""}`}
            style={{ fontSize: "0.82rem", padding: "6px 14px", borderRadius: "8px" }}
          >
            ✅ Inscritas ({enrolledCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("available")}
            className={`uninova-view-pill ${filterMode === "available" ? "active" : ""}`}
            style={{ fontSize: "0.82rem", padding: "6px 14px", borderRadius: "8px" }}
          >
            ⭕ Disponibles ({allCards.length - enrolledCount})
          </button>
        </div>

        <div style={{ position: "relative", minWidth: "260px", flex: "1", maxWidth: "380px" }}>
          <span
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
              fontSize: "0.9rem",
            }}
          >
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por materia, código o docente..."
            className="uninova-auth-input"
            style={{
              paddingLeft: "36px",
              height: "38px",
              fontSize: "0.85rem",
              borderRadius: "8px",
            }}
          />
        </div>
      </div>

      {/* GRID OF SUBJECT CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: "16px",
        }}
      >
        {filteredCards.map((card) => (
          <div
            key={card.id}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              border: card.isEnrolled
                ? "1.5px solid #3b82f6"
                : "1px solid rgba(0,0,0,0.08)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "16px",
              transition: "all 0.2s ease",
              boxShadow: card.isEnrolled
                ? "0 4px 14px rgba(59, 130, 246, 0.08)"
                : "0 2px 6px rgba(0,0,0,0.02)",
            }}
          >
            {/* CARD TOP */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "1.4rem" }}>{card.icon}</span>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      backgroundColor: "rgba(0,0,0,0.04)",
                      color: "#475569",
                    }}
                  >
                    {card.code}
                  </span>
                </div>

                <span
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 800,
                    padding: "3px 9px",
                    borderRadius: "12px",
                    backgroundColor: card.isEnrolled
                      ? "rgba(16, 185, 129, 0.12)"
                      : "rgba(100, 116, 139, 0.08)",
                    color: card.isEnrolled ? "#059669" : "#64748b",
                    border: card.isEnrolled
                      ? "1px solid rgba(16, 185, 129, 0.3)"
                      : "1px solid rgba(100, 116, 139, 0.2)",
                  }}
                >
                  {card.isEnrolled ? "✅ Inscrita" : "⭕ No Inscrita"}
                </span>
              </div>

              <h2
                style={{
                  fontSize: "1.08rem",
                  fontWeight: 800,
                  color: "#0f172a",
                  margin: "0 0 6px 0",
                  lineHeight: 1.3,
                }}
              >
                {card.displayName}
              </h2>

              <p
                style={{
                  margin: 0,
                  fontSize: "0.82rem",
                  color: "#64748b",
                  fontWeight: 500,
                }}
              >
                {card.category}
              </p>

              <div
                style={{
                  marginTop: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.82rem",
                  color: "#334155",
                }}
              >
                <span style={{ opacity: 0.7 }}>👨‍🏫</span>
                <strong>{card.professorName}</strong>
              </div>
            </div>

            {/* CARD BOTTOM / ACTIONS */}
            <div
              style={{
                paddingTop: "14px",
                borderTop: "1px solid rgba(0,0,0,0.06)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {/* Classmates indicator */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.78rem",
                  color: "#64748b",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "#3b82f6",
                  }}
                />
                <span>
                  👥 <strong>{card.peers[0]}</strong>
                </span>
              </div>

              {/* Toggle button */}
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleToggleEnrollment(card)}
                style={{
                  padding: "7px 14px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  borderRadius: "8px",
                  cursor: "pointer",
                  border: card.isEnrolled
                    ? "1px solid rgba(239, 68, 68, 0.3)"
                    : "1px solid #3b82f6",
                  backgroundColor: card.isEnrolled
                    ? "rgba(239, 68, 68, 0.06)"
                    : "#3b82f6",
                  color: card.isEnrolled ? "#ef4444" : "#ffffff",
                  transition: "all 0.15s ease",
                }}
              >
                {card.isEnrolled ? "✕ Desinscribir" : "➕ Inscribir"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredCards.length === 0 && (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            border: "1px dashed rgba(0,0,0,0.15)",
            marginTop: "16px",
          }}
        >
          <div style={{ fontSize: "2.4rem", marginBottom: "10px" }}>🔍</div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: "0 0 6px 0" }}>
            No se encontraron asignaturas
          </h2>
          <p style={{ fontSize: "0.88rem", color: "#64748b", margin: 0 }}>
            No hay materias que coincidan con &quot;{searchQuery}&quot;. Puedes crearla con el botón de abajo.
          </p>
          <button
            type="button"
            onClick={() => {
              setNewSubjectName(searchQuery);
              setShowCreateModal(true);
              setCreateStep(1);
            }}
            className="uninova-btn-primary"
            style={{ marginTop: "14px", padding: "8px 16px", fontSize: "0.85rem" }}
          >
            ➕ Crear &quot;{searchQuery}&quot;
          </button>
        </div>
      )}

      {/* MULTI-STEP MODAL CREAR MATERIA */}
      {showCreateModal && (
        <div className="uninova-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div
            className="uninova-modal-card"
            style={{ maxWidth: "560px", padding: "28px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "18px",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.6px",
                    color: "#2563eb",
                  }}
                >
                  Paso {createStep} de 3 · Alta de Asignatura
                </span>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: "2px 0 0 0", color: "#0f172a" }}>
                  {createStep === 1 && "1. Datos de la Materia"}
                  {createStep === 2 && "2. Verificación de Duplicados"}
                  {createStep === 3 && "3. Confirmación Final"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="uninova-drawer-close-btn"
                style={{ fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            {/* STEP 1: FORM */}
            {createStep === 1 && (
              <div>
                <p style={{ fontSize: "0.88rem", color: "#64748b", marginBottom: "16px" }}>
                  Ingresa el nombre oficial de la asignatura para verificar su existencia en el catálogo.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Nombre de la Asignatura *
                    </label>
                    <input
                      type="text"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      placeholder="Ej. Robótica Industrial, Termodinámica..."
                      className="uninova-auth-input"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Código de Materia (Opcional)
                    </label>
                    <input
                      type="text"
                      value={newSubjectCode}
                      onChange={(e) => setNewSubjectCode(e.target.value)}
                      placeholder="Ej. ROB-401, MEC-305..."
                      className="uninova-auth-input"
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Docente Titular (Opcional)
                    </label>
                    <input
                      type="text"
                      value={newSubjectProf}
                      onChange={(e) => setNewSubjectProf(e.target.value)}
                      placeholder="Ej. Ing. Carlos Mendoza"
                      className="uninova-auth-input"
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "22px" }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="uninova-btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!newSubjectName.trim()}
                    onClick={() => setCreateStep(2)}
                    className="uninova-btn-primary"
                  >
                    Verificar en Catálogo ➔
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: DUPLICATES CHECK */}
            {createStep === 2 && (
              <div>
                {existingMatches.length > 0 ? (
                  <div
                    style={{
                      padding: "14px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(245, 158, 11, 0.1)",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      marginBottom: "16px",
                    }}
                  >
                    <strong style={{ display: "block", color: "#b45309", fontSize: "0.9rem", marginBottom: "6px" }}>
                      ⚠️ Materias similares encontradas en el catálogo:
                    </strong>
                    <ul style={{ margin: "0 0 0 16px", padding: 0, fontSize: "0.85rem", color: "#92400e" }}>
                      {existingMatches.map((m) => (
                        <li key={m.id} style={{ marginBottom: "4px" }}>
                          <strong>{m.displayName}</strong> ({m.code}) - {m.isEnrolled ? "✅ Ya la tienes inscrita" : "Disponible para inscribir"}
                        </li>
                      ))}
                    </ul>
                    <p style={{ margin: "8px 0 0 0", fontSize: "0.8rem", color: "#b45309" }}>
                      Si tu materia es diferente a las anteriores, puedes continuar con la creación.
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "14px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(16, 185, 129, 0.1)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      marginBottom: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span style={{ fontSize: "1.4rem" }}>✅</span>
                    <span style={{ fontSize: "0.88rem", color: "#065f46", fontWeight: 600 }}>
                      Asignatura verificada. No existen duplicados conflictivos en tu plan de estudios.
                    </span>
                  </div>
                )}

                <div
                  style={{
                    backgroundColor: "rgba(0,0,0,0.02)",
                    padding: "14px",
                    borderRadius: "10px",
                    border: "1px solid rgba(0,0,0,0.06)",
                    marginBottom: "16px",
                    fontSize: "0.86rem",
                  }}
                >
                  <div style={{ marginBottom: "6px" }}>
                    <span style={{ color: "#64748b" }}>Materia: </span>
                    <strong style={{ color: "#0f172a" }}>{newSubjectName.trim()}</strong>
                  </div>
                  <div style={{ marginBottom: "6px" }}>
                    <span style={{ color: "#64748b" }}>Código: </span>
                    <strong style={{ color: "#0f172a" }}>{newSubjectCode.trim() || "Auto-generado"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>Docente: </span>
                    <strong style={{ color: "#0f172a" }}>{newSubjectProf.trim() || "Docente Titular"}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "22px" }}>
                  <button
                    type="button"
                    onClick={() => setCreateStep(1)}
                    className="uninova-btn-secondary"
                  >
                    ← Volver a Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateStep(3)}
                    className="uninova-btn-primary"
                  >
                    Confirmar Datos ➔
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: FINAL CONFIRMATION */}
            {createStep === 3 && (
              <div>
                <p style={{ fontSize: "0.9rem", color: "#334155", lineHeight: 1.5, marginBottom: "16px" }}>
                  Estás a punto de registrar <strong>&quot;{newSubjectName.trim()}&quot;</strong> y matricularla
                  en tu horario oficial de Universidad OS para el semestre {currentTermKey}.
                </p>

                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "12px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(59, 130, 246, 0.06)",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                    cursor: "pointer",
                    marginBottom: "20px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={confirmCheckbox}
                    onChange={(e) => setConfirmCheckbox(e.target.checked)}
                    style={{ marginTop: "3px", width: "16px", height: "16px" }}
                  />
                  <span style={{ fontSize: "0.84rem", color: "#1e3a8a", fontWeight: 600 }}>
                    Confirmo que esta materia pertenece a mi cohorte de Ingeniería y deseo inscribirme de forma inmediata.
                  </span>
                </label>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => setCreateStep(2)}
                    className="uninova-btn-secondary"
                  >
                    ← Revisar
                  </button>
                  <button
                    type="button"
                    disabled={!confirmCheckbox || createLoading}
                    onClick={handleCreateSubjectSubmit}
                    className="uninova-btn-primary"
                    style={{
                      backgroundColor: confirmCheckbox ? "#10b981" : "#94a3b8",
                      borderColor: confirmCheckbox ? "#059669" : "#94a3b8",
                    }}
                  >
                    {createLoading ? "Registrando..." : "🚀 Crear e Inscribirme Ahora"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
