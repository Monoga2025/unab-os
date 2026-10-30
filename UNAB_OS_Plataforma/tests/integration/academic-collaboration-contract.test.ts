import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  requireInstitutionalUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/auth", () => ({ requireInstitutionalUser: mocks.requireInstitutionalUser }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { softDeleteAcademicItem, updateAcademicItem } from "@/app/actions/academic-collaboration";
import { getSectionWorkspace } from "@/lib/academic-collaboration/queries";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const actionsPath = "app/actions/academic-collaboration.ts";
const queriesPath = "lib/academic-collaboration/queries.ts";
const sectionId = "11111111-1111-4111-8111-111111111111";
const itemId = "22222222-2222-4222-8222-222222222222";

describe("academic collaboration server boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses server actions with a server-derived institutional identity", () => {
    expect(existsSync(resolve(process.cwd(), actionsPath))).toBe(true);
    const actions = source(actionsPath);

    expect(actions).toContain('"use server"');
    expect(actions).toContain("requireInstitutionalUser()");
    expect(actions).toContain("validateAcademicItem");
    expect(actions).not.toMatch(/formData\.get\("(?:userId|actorId|createdBy|updatedBy)"\)/);
  });

  it("keeps every shared query scoped to the member and active content", () => {
    expect(existsSync(resolve(process.cwd(), queriesPath))).toBe(true);
    const queries = source(queriesPath);

    expect(queries).toContain("requireInstitutionalUser()");
    expect(queries).toContain('.eq("user_id", userId)');
    expect(queries).toContain('.eq("deleted_at", null)');
    expect(queries).toContain("getAcademicDashboard");
    expect(queries).toContain("return null");
  });

  it("maps stale edits to a conflict without discarding the attempted body", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: { code: "ACV01", message: "academic item version conflict" } });
    const maybeSingle = vi.fn().mockResolvedValue({ data: { version: 9, body: "latest body" }, error: null });
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }),
      }),
    });
    mocks.requireInstitutionalUser.mockResolvedValue({ supabase: { rpc, from } });

    const formData = new FormData();
    formData.set("itemId", itemId);
    formData.set("sectionId", sectionId);
    formData.set("itemType", "task");
    formData.set("title", "Entrega");
    formData.set("body", "attempted body");
    formData.set("importance", "high");
    formData.set("dueAt", "2026-09-14T12:00:00.000Z");
    formData.set("expectedVersion", "8");

    await expect(updateAcademicItem(formData)).resolves.toMatchObject({
      ok: false,
      conflict: { currentVersion: 9, currentBody: "latest body", attemptedBody: "attempted body" },
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("returns unavailable before reading a denied section title", async () => {
    const membershipResult = Promise.resolve({ data: [], error: null });
    const membershipQuery = {
      eq: vi.fn().mockReturnValue(membershipResult),
      then: membershipResult.then.bind(membershipResult),
    };
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ is: vi.fn().mockReturnValue(membershipQuery) }),
      }),
    });
    mocks.requireInstitutionalUser.mockResolvedValue({ userId: "member-id" });
    mocks.createClient.mockResolvedValue({ from });

    await expect(getSectionWorkspace(sectionId, "member-id")).resolves.toBeNull();
    expect(mocks.requireInstitutionalUser).toHaveBeenCalledOnce();
    expect(from).toHaveBeenCalledWith("section_memberships");
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("derives update cache scope from the returned item rather than the submitted section", async () => {
    const actualSectionId = "33333333-3333-4333-8333-333333333333";
    const rpc = vi.fn().mockResolvedValue({ data: { id: itemId, section_id: actualSectionId }, error: null });
    mocks.requireInstitutionalUser.mockResolvedValue({ supabase: { rpc } });

    const formData = new FormData();
    formData.set("itemId", itemId);
    formData.set("sectionId", sectionId);
    formData.set("itemType", "task");
    formData.set("title", "Entrega");
    formData.set("body", "updated body");
    formData.set("importance", "high");
    formData.set("dueAt", "2026-09-14T12:00:00.000Z");
    formData.set("expectedVersion", "8");

    await expect(updateAcademicItem(formData)).resolves.toMatchObject({ ok: true });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/section/${actualSectionId}`);
    expect(mocks.revalidatePath).not.toHaveBeenCalledWith(`/section/${sectionId}`);
  });

  it("derives deleted-item cache scope from a member-readable revision", async () => {
    const actualSectionId = "33333333-3333-4333-8333-333333333333";
    const maybeSingle = vi.fn().mockResolvedValue({ data: { section_id: actualSectionId }, error: null });
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ maybeSingle }) }),
        }),
      }),
    });
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    mocks.requireInstitutionalUser.mockResolvedValue({ supabase: { from, rpc } });

    const formData = new FormData();
    formData.set("itemId", itemId);
    formData.set("sectionId", sectionId);
    formData.set("expectedVersion", "8");

    await expect(softDeleteAcademicItem(formData)).resolves.toMatchObject({ ok: true });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/section/${actualSectionId}`);
    expect(mocks.revalidatePath).not.toHaveBeenCalledWith(`/section/${sectionId}`);
  });

  it("enforces materias page and academic onboarding requirements", () => {
    expect(existsSync(resolve(process.cwd(), "app/(app)/materias/page.tsx"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "components/academic-onboarding.tsx"))).toBe(true);

    const materiasPage = source("app/(app)/materias/page.tsx");
    const onboarding = source("components/academic-onboarding.tsx");
    const temaPage = source("app/(app)/tema/page.tsx");
    const styles = source("app/styles.css");

    expect(materiasPage).toContain("requireInstitutionalUser()");
    expect(onboarding).toContain("Buscar materia");
    expect(onboarding).toContain("normalizeCatalogKey");
    expect(onboarding).toContain("Confirmar nueva materia");
    expect(onboarding).toContain("Crear grupo con profesor");
    expect(onboarding).toContain("action={joinAction}");
    expect(temaPage).toContain("Beta — no conectado");
    expect(styles).toContain(".academic-onboarding");
    expect(styles).not.toMatch(/\.academic-[^{]+\{[^}]*#[0-9a-f]/i);
  });

  it("enforces section workspace, form, history, and conflict handling", () => {
    expect(existsSync(resolve(process.cwd(), "app/(app)/section/[sectionId]/page.tsx"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "components/academic-section-workspace.tsx"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "components/academic-item-form.tsx"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "components/academic-item-history.tsx"))).toBe(true);

    const sectionPage = source("app/(app)/section/[sectionId]/page.tsx");
    const workspace = source("components/academic-section-workspace.tsx");
    const form = source("components/academic-item-form.tsx");
    const history = source("components/academic-item-history.tsx");

    expect(sectionPage).toContain("getSectionWorkspace");
    expect(sectionPage).toContain("notFound()");
    expect(workspace).toContain('["note", "event", "reminder", "task", "evaluation"]');
    expect(form).toContain("expectedVersion");
    expect(form).toContain('itemType === "evaluation"');
    expect(form).toContain('itemType === "note"');
    expect(history).toContain("createdBy");
    expect(history).toContain("updatedBy");
    expect(history).toContain("Restaurar");
    expect(workspace).toContain("Tu borrador no se guardó porque otra persona actualizó este contenido.");
  });

  it("enforces shared evaluations calendar and active navigation", () => {
    expect(existsSync(resolve(process.cwd(), "app/(app)/evaluaciones/page.tsx"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "app/(app)/evaluaciones/[itemId]/page.tsx"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "components/academic-evaluation-calendar.tsx"))).toBe(true);

    const shell = source("components/application-shell.tsx");
    const calendar = source("components/academic-evaluation-calendar.tsx");
    const detailPage = source("app/(app)/evaluaciones/[itemId]/page.tsx");

    expect(shell).toContain('{ href: "/evaluaciones", label: "Evaluaciones", icon: "calendar" as const }');
    expect(shell).not.toContain('{ label: "Evaluaciones", icon: "calendar" as const }');
    expect(calendar).toContain('aria-label="Semana anterior"');
    expect(calendar).toContain('aria-label="Semana siguiente"');
    expect(calendar).toContain("Vista de agenda");
    expect(detailPage).toContain("getEvaluationDetail");
    expect(detailPage).toContain("Instrucciones");
    expect(detailPage).toContain("Ejercicios");
  });

  it("merges shared priorities and agenda into Inicio without TEMA coupling", () => {
    const dashboard = source("app/(app)/dashboard/page.tsx");

    expect(dashboard).toContain("getAcademicDashboard");
    expect(dashboard).toContain("sharedDashboard.priority");
    expect(dashboard).toContain("Add your subjects.");
    expect(dashboard).not.toContain('from("tema_courses").select("*, academic_items")');
  });

  it("proves accessibility, token isolation, and independence from legacy tema domain", () => {
    const styles = source("app/styles.css");
    const academicStylesStart = styles.indexOf("/* Academic collaboration beta styles");
    const academicStyles = styles.slice(academicStylesStart);

    expect(academicStyles).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(academicStyles).toContain(":focus-visible");
    expect(styles).toContain("@media(prefers-reduced-motion:reduce)");

    for (const routePath of [
      "app/(app)/materias/page.tsx",
      "app/(app)/section/[sectionId]/page.tsx",
      "app/(app)/evaluaciones/page.tsx",
      "app/(app)/evaluaciones/[itemId]/page.tsx",
      "components/academic-onboarding.tsx",
      "components/academic-section-workspace.tsx",
      "components/academic-item-form.tsx",
      "components/academic-item-history.tsx",
      "components/academic-evaluation-calendar.tsx",
    ]) {
      const content = source(routePath);
      expect(content).not.toContain("@/lib/tema/data");
      expect(content).not.toContain("tema_courses");
    }
  });
});