import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const page = source("app/(app)/tema/course/[courseId]/page.tsx");
const component = source("components/course-study-map.tsx");
const action = source("app/actions/academic-map.ts");
const evidence = source("lib/tema/academic-evidence.ts");
const migration = source("supabase/migrations/20260826213000_course_study_boundaries.sql");
const styles = source("app/styles.css");

describe("deterministic course study map contract", () => {
  it("persists one private generic class boundary per owned course", () => {
    expect(migration).toMatch(/create table public\.course_study_boundaries/);
    expect(migration).toMatch(/owner_id uuid not null references auth\.users\(id\) on delete cascade/);
    expect(migration).toMatch(/boundary_text varchar\(4000\)/);
    expect(migration).toMatch(/unique \(owner_id, course_source_id\)/);
    expect(migration).toMatch(/enable row level security/);
    for (const operation of ["select", "insert", "update", "delete"]) {
      expect(migration).toMatch(new RegExp(`for ${operation} to authenticated`));
    }
    expect(migration).toMatch(/\(select auth\.uid\(\)\) = owner_id/);
  });

  it("validates ownership and length before upserting the boundary", () => {
    expect(action).toMatch(/COURSE_ID_PATTERN = \/\^\[A-Za-z0-9_-\]\{1,128\}\$\//);
    expect(action).toMatch(/MAX_BOUNDARY_LENGTH = 4_000/);
    expect(action).toMatch(/requireUser\(\)/);
    expect(action).toMatch(/from\("tema_courses"\)[\s\S]*?owner_id[\s\S]*?catalog_visible[\s\S]*?source_id/);
    expect(action).toMatch(/from\("course_study_boundaries"\)\.upsert/);
    expect(action).toMatch(/onConflict: "owner_id,course_source_id"/);
    expect(action).toMatch(/revalidatePath\(`\/tema\/course\//);
  });

  it("builds and renders the map without an AI or exposing private paths", () => {
    expect(page).toMatch(/buildCourseAcademicEvidence/);
    expect(page).toMatch(/analyzeAcademicMaterials/);
    expect(page).toMatch(/<CourseStudyMap/);
    expect(page).toMatch(/boundaryResult\.error \? null/);
    expect(page).toMatch(/href: file \? `\/api\/tema\/files\/\$\{encodeURIComponent\(file\.candidateId\)\}` : null/);
    expect(component).toContain("Mapa de estudio sin IA");
    expect(component).toContain("Aún no hay evidencia suficiente");
    expect(component).toContain("Hay material que necesita OCR");
    expect(`${page}\n${component}`).not.toMatch(/localRelativePath|OPENAI|NVIDIA|chat\/completions|fetch\(/i);
    expect(evidence).toMatch(/textExtractionStatus !== "ready"/);
  });

  it("keeps the table contained and the form touch-friendly from mobile upward", () => {
    expect(styles).toMatch(/\.course-study-table-wrap\{[^}]*overflow-x:auto/);
    expect(styles).toMatch(/\.course-study-boundary-form button\{[^}]*min-height:44px/);
    expect(styles).toMatch(/@media\(min-width:768px\)\{\.course-study-map/);
  });
});
