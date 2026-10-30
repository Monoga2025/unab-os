import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const panelPage = source("app/(app)/tema/page.tsx");
const coursePage = source("app/(app)/tema/course/[courseId]/page.tsx");
const panel = source("components/tema-panel.tsx");
const shell = source("components/application-shell.tsx");
const dashboard = source("app/(app)/dashboard/page.tsx");
const workspace = source("lib/tema/workspace.ts");
const clientSurface = `${panel}\n${shell}`;

describe("TEMA-first academic UI contract", () => {
  it("loads through server-only TEMA data and sends only sanitized view models to clients", () => {
    expect(panelPage).toMatch(/loadTemaData\(userId\)/);
    expect(coursePage).toMatch(/getTemaCourse\(courseId,\s*userId\)/);
    expect(coursePage).toMatch(/getTemaSections\(courseId,\s*userId\)/);
    expect(coursePage).toMatch(/getTemaActivities\(courseId,\s*undefined,\s*userId\)/);
    expect(panel).toMatch(/^"use client";/);
    expect(clientSurface).not.toMatch(/localRelativePath|sha256|contentType|TEMA_DATA_ROOT|inventory\.json|download-manifest\.json/);
    expect(clientSurface).not.toMatch(/source(?:Fetch|Final|Display)?Url|fetch_url|final_url|display_url|cookie|token/i);
    expect(clientSurface).not.toMatch(/\/home\/|\\Users\\|https?:\/\//);
  });

  it("keeps every resource inside its course and opens it only through the authenticated route", () => {
    expect(coursePage).toMatch(/href=\{`\/api\/tema\/files\/\$\{encodeURIComponent\(file\.candidateId\)\}`\}/);
    expect(coursePage).toMatch(/Estudiar con Jarvis/);
    expect(panel).not.toMatch(/\/api\/tema\/files/);
    expect(coursePage).not.toMatch(/href=\{[^}]*file\.(?:fileName|path|url)/i);
    expect(panel).toContain("Ya no se mezclan en una lista global");
  });

  it("places active courses first and keeps historical or ambiguous courses searchable", () => {
    expect(shell).toMatch(/href:\s*"\/tema",\s*label:\s*"Materias"/);
    expect(panelPage).toMatch(/splitTemaCourses/);
    expect(panel).toMatch(/course\.state\s*===\s*"active"/);
    expect(panel).toContain("Históricas y sin clasificar");
    expect(panel).toMatch(/type="search"/);
  });

  it("renders one next-best action instead of a global PDF feed", () => {
    expect(dashboard).toMatch(/prioritizedDeadlines\(temaData/);
    expect(dashboard).toMatch(/activeSession[\s\S]*plannedSession[\s\S]*nextReportAction/);
    expect(dashboard).toMatch(/className="focus-hero"/);
    expect(dashboard).toMatch(/className="focus-primary-action"/);
    expect(dashboard).not.toMatch(/candidateId|JarvisCoachPanel|temaData\.files\.slice/);
    expect(dashboard).not.toMatch(/dynamics-101|from\("objectives"\)|from\("attempts"\)|from\("mastery"\)/);
  });

  it("uses structured dates with bounded urgency and excludes completed work", () => {
    expect(workspace).toMatch(/activity\.completionState === "submitted" \|\| activity\.completionState === "graded"/);
    expect(workspace).toMatch(/VERIFIED_OVERDUE_DAYS = 2/);
    expect(workspace).toMatch(/activity\.completionState !== "pending"/);
    expect(workspace).toMatch(/now \+ 30 \* DAY/);
    expect(workspace).toMatch(/activity\.dueAt/);
    expect(dashboard).toMatch(/timeZone:\s*"America\/Bogota"/);
  });
});
