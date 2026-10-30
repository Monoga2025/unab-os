import { describe, expect, it } from "vitest";
import {
  ACADEMIC_ITEM_TYPES,
  AcademicAgendaEntry,
  AcademicItemInput,
  compareAcademicAgendaEntries,
  normalizeCatalogKey,
  normalizeInstitutionalEmail,
  validateAcademicItem,
} from "@/lib/domain/academic-collaboration";

describe("academic collaboration domain rules", () => {
  it("normalizes and validates institutional email addresses", () => {
    expect(normalizeInstitutionalEmail(" ANA@UNAB.EDU.CO ")).toBe("user9@example.edu");
    expect(normalizeInstitutionalEmail("user10@example.edu")).toBeNull();
    expect(normalizeInstitutionalEmail("ana@example.com")).toBeNull();
  });

  it("normalizes catalog keys across case, accents, whitespace, and separators", () => {
    expect(normalizeCatalogKey(" CÁLCULO. I ")).toBe("calculo i");
    expect(normalizeCatalogKey("calculo-i")).toBe("calculo i");
    expect(normalizeCatalogKey("  Diseño__de / Datos  ")).toBe("diseno de datos");
  });

  it("requires the relevant time field for timed academic item types", () => {
    expect(
      validateAcademicItem({ itemType: "evaluation", dueAt: null } as AcademicItemInput).dueAt,
    ).toContain("fecha");
    expect(validateAcademicItem({ itemType: "task", dueAt: null } as AcademicItemInput).dueAt).toContain(
      "fecha",
    );
    expect(
      validateAcademicItem({ itemType: "reminder", dueAt: null } as AcademicItemInput).dueAt,
    ).toContain("fecha");
    expect(
      validateAcademicItem({ itemType: "event", startsAt: null } as AcademicItemInput).startsAt,
    ).toContain("fecha");
  });

  it("does not require time metadata for notes", () => {
    expect(validateAcademicItem({ itemType: "note", dueAt: null, startsAt: null } as AcademicItemInput)).toEqual(
      {},
    );
  });

  it("exports the complete academic item type contract", () => {
    expect(ACADEMIC_ITEM_TYPES).toEqual(["note", "event", "reminder", "task", "evaluation"]);
  });

  it("orders urgent evaluations before urgent tasks and event/reminders", () => {
    const now = new Date("2026-09-13T12:00:00.000Z");
    const entry = (itemType: AcademicAgendaEntry["itemType"], id: string): AcademicAgendaEntry => ({
      id,
      sectionId: "section-1",
      subjectName: "Calculus I",
      professorName: "Ada Lovelace",
      itemType,
      title: id,
      importance: "normal",
      occursAt: "2026-09-14T12:00:00.000Z",
      href: `/academic/${id}`,
    });

    expect(compareAcademicAgendaEntries(entry("evaluation", "evaluation"), entry("task", "task"), now)).toBeLessThan(0);
    expect(compareAcademicAgendaEntries(entry("task", "task"), entry("event", "event"), now)).toBeLessThan(0);
    expect(compareAcademicAgendaEntries(entry("event", "event"), entry("reminder", "reminder"), now)).toBeLessThan(0);
  });

  it("uses importance, timestamp, and title as deterministic tie breakers", () => {
    const now = new Date("2026-09-13T12:00:00.000Z");
    const base: AcademicAgendaEntry = {
      id: "one",
      sectionId: "section-1",
      subjectName: "Calculus I",
      professorName: "Ada Lovelace",
      itemType: "task",
      title: "Alpha",
      importance: "normal",
      occursAt: "2026-09-14T12:00:00.000Z",
      href: "/academic/one",
    };
    const copy = (updates: Partial<AcademicAgendaEntry>): AcademicAgendaEntry => ({ ...base, ...updates });

    expect(compareAcademicAgendaEntries(copy({ importance: "critical" }), base, now)).toBeLessThan(0);
    expect(
      compareAcademicAgendaEntries(
        copy({ occursAt: "2026-09-13T12:00:00.000Z" }),
        copy({ occursAt: "2026-09-14T12:00:00.000Z" }),
        now,
      ),
    ).toBeLessThan(0);
    expect(compareAcademicAgendaEntries(copy({ title: "Alpha" }), copy({ title: "Beta" }), now)).toBeLessThan(0);
  });
});
