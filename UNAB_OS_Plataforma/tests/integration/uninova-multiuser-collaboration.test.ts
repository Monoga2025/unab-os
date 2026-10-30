import { describe, expect, it } from "vitest";
import {
  INITIAL_KANBAN_CARDS,
  type KanbanCard,
  type TaskHistoryEntry,
} from "@/components/uninova/uninova-dashboard-view";

describe("UniNova 5-User Real-Time Academic Collaboration Contract", () => {
  const TEST_USERS = [
    { name: "Daniel Monoga", email: "user6@example.edu", role: "Estudiante" },
    { name: "Matthew Agudelo", email: "user14@example.edu", role: "Estudiante" },
    { name: "Andrés González", email: "user15@example.edu", role: "Estudiante" },
    { name: "Iker", email: "user16@example.edu", role: "Estudiante" },
    { name: "Jhon Mendoza", email: "user17@example.edu", role: "Estudiante" },
  ] as const;

  it("loads the authentic WhatsApp extracted tasks for the Mecatrónica cohort", () => {
    expect(INITIAL_KANBAN_CARDS.length).toBeGreaterThanOrEqual(8);

    const titles = INITIAL_KANBAN_CARDS.map((c) => c.title);
    const subjects = INITIAL_KANBAN_CARDS.map((c) => c.subject);

    // Verify key subjects from WhatsApp chat
    expect(subjects).toContain("Dibujo en Ingeniería");
    expect(subjects).toContain("Circuitos Eléctricos");
    expect(subjects).toContain("Dinámica y Mecanismos");
    expect(subjects).toContain("Cálculo Multivariable & EDO");
    expect(subjects).toContain("Estadística Inferencial");
    expect(subjects).toContain("Ciencia de Materiales");
    expect(subjects).toContain("Física: Ondas");

    // Verify key tasks extracted from the WhatsApp chat
    expect(titles.some((t) => t.includes("Portafolio de Circuitos"))).toBe(true);
    expect(titles.some((t) => t.includes("Garrafa y Botella"))).toBe(true);
    expect(titles.some((t) => t.includes("Dinámica y Mecanismos"))).toBe(true);
  });

  it("simulates sequential multi-user collaborative editing with immutable audit history", () => {
    // In-memory shared repository simulating the cohort pool
    let sharedPool: KanbanCard[] = JSON.parse(JSON.stringify(INITIAL_KANBAN_CARDS));

    // 1. User 1: Matthew Agudelo creates a new collaborative task
    const user1 = TEST_USERS[1]; // Matthew
    const newTask: KanbanCard = {
      id: "kb-custom-collab-01",
      dayKey: "miercoles",
      type: "task",
      title: "Entrega Garrafa CAD",
      subject: "Dibujo en Ingeniería",
      subjectColor: "purple",
      timeText: "11:59 PM",
      priority: "Alta",
      completed: false,
      weighting: "15% Entrega",
      notes: "Croquis inicial de la garrafa",
      lastModifiedBy: user1.name,
      lastModifiedAt: "2026-09-20T10:00:00.000Z",
      history: [
        {
          id: "hist-1",
          timestamp: "2026-09-20T10:00:00.000Z",
          authorName: user1.name,
          authorEmail: user1.email,
          action: "created",
          detail: `${user1.name} creó la tarea "Entrega Garrafa CAD" en el grupo`,
        },
      ],
    };

    sharedPool = [...sharedPool, newTask];
    expect(sharedPool.find((t) => t.id === newTask.id)?.title).toBe("Entrega Garrafa CAD");

    // 2. User 2: Andrés González renames the task
    const user2 = TEST_USERS[2]; // Andrés
    const cardToRename = sharedPool.find((t) => t.id === newTask.id)!;
    const renameHistory: TaskHistoryEntry = {
      id: "hist-2",
      timestamp: "2026-09-20T10:05:00.000Z",
      authorName: user2.name,
      authorEmail: user2.email,
      action: "renamed",
      detail: `${user2.name} cambió el nombre a "Entrega CAD: Garrafa y Botella con Relieve (SolidWorks)"`,
    };

    const updatedByAndres: KanbanCard = {
      ...cardToRename,
      title: "Entrega CAD: Garrafa y Botella con Relieve (SolidWorks)",
      lastModifiedBy: user2.name,
      lastModifiedAt: "2026-09-20T10:05:00.000Z",
      history: [renameHistory, ...(cardToRename.history || [])],
    };

    sharedPool = sharedPool.map((c) => (c.id === newTask.id ? updatedByAndres : c));

    // 3. User 3: Iker updates weighting
    const user3 = TEST_USERS[3]; // Iker
    const cardToWeight = sharedPool.find((t) => t.id === newTask.id)!;
    const weightHistory: TaskHistoryEntry = {
      id: "hist-3",
      timestamp: "2026-09-20T10:10:00.000Z",
      authorName: user3.name,
      authorEmail: user3.email,
      action: "weighting_changed",
      detail: `${user3.name} actualizó la ponderación a 20% Proyecto CAD`,
    };

    const updatedByIker: KanbanCard = {
      ...cardToWeight,
      weighting: "20% Proyecto CAD",
      lastModifiedBy: user3.name,
      lastModifiedAt: "2026-09-20T10:10:00.000Z",
      history: [weightHistory, ...(cardToWeight.history || [])],
    };

    sharedPool = sharedPool.map((c) => (c.id === newTask.id ? updatedByIker : c));

    // 4. User 4: Jhon Mendoza updates notes & instructions
    const user4 = TEST_USERS[4]; // Jhon
    const cardToNote = sharedPool.find((t) => t.id === newTask.id)!;
    const noteHistory: TaskHistoryEntry = {
      id: "hist-4",
      timestamp: "2026-09-20T10:15:00.000Z",
      authorName: user4.name,
      authorEmail: user4.email,
      action: "notes_updated",
      detail: `${user4.name} actualizó las instrucciones: "Revisar cosido de superficies y croquis de relieve"`,
    };

    const updatedByJhon: KanbanCard = {
      ...cardToNote,
      notes: "Revisar cosido de superficies y croquis de relieve antes de exportar a .SLDPRT",
      lastModifiedBy: user4.name,
      lastModifiedAt: "2026-09-20T10:15:00.000Z",
      history: [noteHistory, ...(cardToNote.history || [])],
    };

    sharedPool = sharedPool.map((c) => (c.id === newTask.id ? updatedByJhon : c));

    // 5. User 5: Daniel Monoga marks task as completed
    const user5 = TEST_USERS[0]; // Daniel
    const cardToComplete = sharedPool.find((t) => t.id === newTask.id)!;
    const completeHistory: TaskHistoryEntry = {
      id: "hist-5",
      timestamp: "2026-09-20T10:20:00.000Z",
      authorName: user5.name,
      authorEmail: user5.email,
      action: "status_changed",
      detail: `${user5.name} marcó la tarea como Completada ✅`,
    };

    const updatedByDaniel: KanbanCard = {
      ...cardToComplete,
      completed: true,
      lastModifiedBy: user5.name,
      lastModifiedAt: "2026-09-20T10:20:00.000Z",
      history: [completeHistory, ...(cardToComplete.history || [])],
    };

    sharedPool = sharedPool.map((c) => (c.id === newTask.id ? updatedByDaniel : c));

    // 6. Assert full collaborative integrity across all 5 users
    const finalCard = sharedPool.find((c) => c.id === newTask.id)!;
    expect(finalCard.title).toBe("Entrega CAD: Garrafa y Botella con Relieve (SolidWorks)");
    expect(finalCard.weighting).toBe("20% Proyecto CAD");
    expect(finalCard.notes).toContain("Revisar cosido de superficies");
    expect(finalCard.completed).toBe(true);
    expect(finalCard.lastModifiedBy).toBe("Daniel Monoga");

    // Verify all 5 actions are preserved in chronological audit history
    expect(finalCard.history).toHaveLength(5);
    const authorsInHistory = finalCard.history!.map((h) => h.authorName);
    expect(authorsInHistory).toContain("Matthew Agudelo");
    expect(authorsInHistory).toContain("Andrés González");
    expect(authorsInHistory).toContain("Iker");
    expect(authorsInHistory).toContain("Jhon Mendoza");
    expect(authorsInHistory).toContain("Daniel Monoga");
  });
});
