import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const migration = source("supabase/migrations/20260823213806_cloud_tema_jarvis_bridge.sql");
const hardeningMigration = source("supabase/migrations/20260825153855_atomic_tema_snapshot_publish.sql");
const auth = source("lib/jarvis/cloud-auth.ts");
const importer = source("scripts/import-tema-cloud.mjs");
const filenameCleaner = source("scripts/lib/tema-filenames.mjs");
const reportRoute = source("app/api/jarvis/bridge/reports/route.ts");

describe("cloud TEMA and Jarvis bridge contract", () => {
  it("isolates every catalog and bridge row by owner with indexed RLS predicates", () => {
    for (const table of ["tema_courses", "tema_sections", "tema_activities", "tema_files", "jarvis_study_handoffs", "jarvis_study_reports"]) {
      expect(migration).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, "i"));
      expect(migration).toMatch(new RegExp(`on public\\.${table}[\\s\\S]*?\\(\\(select auth\\.uid\\(\\)\\) = owner_id\\)`, "i"));
    }
    expect(migration).toMatch(/jarvis_handoffs_owner_status_created_idx/);
    expect(migration).toMatch(/tema_files_owner_updated_idx/);
  });

  it("keeps TEMA bytes private and makes service_role the only direct storage actor", () => {
    expect(migration).toMatch(/'tema-private', 'tema-private', false/);
    for (const operation of ["read", "insert", "update", "delete"]) {
      expect(hardeningMigration).toContain(`drop policy if exists "${operation} own private tema objects"`);
    }
    expect(source("app/api/tema/files/[candidateId]/route.ts")).toMatch(/requireUser\(\)[\s\S]*createAdminClient\(\)\.storage/);
  });

  it("uses a constant-time scoped bridge token and validates reports before persistence", () => {
    expect(auth).toMatch(/timingSafeEqual/);
    expect(auth).toMatch(/JARVIS_BRIDGE_OWNER_ID/);
    expect(auth).toMatch(/configuredToken\.length < 32/);
    expect(reportRoute).toMatch(/validateCloudReport/);
    expect(reportRoute).toMatch(/Handoff was not delivered/);
  });

  it("imports verified files idempotently in bounded metadata batches", () => {
    expect(importer).toMatch(/index \+= 100/);
    expect(importer).toMatch(/\.upsert\(/);
    expect(importer).toMatch(/upsert: false/);
    expect(importer).toMatch(/already exists\|duplicate/);
    expect(importer).toMatch(/createHash\("sha256"\)/);
    expect(importer).toMatch(/safeExtension/);
    expect(importer).toMatch(/\$\{digest\}-\$\{file\.candidate_id\}\$\{safeExtension\}/);
    expect(importer).not.toMatch(/\$\{digest\}-\$\{safeName\}/);
    expect(importer).toMatch(/cleanDisplayFileName/);
    expect(filenameCleaner).toMatch(/Buffer\.from\(value, "latin1"\)\.toString\("utf8"\)/);
    expect(filenameCleaner).toMatch(/\\u007f-\\u009f/);
    expect(importer).toMatch(/SUPABASE_SECRET_KEY \|\| process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
    expect(importer).not.toMatch(/TELEGRAM_BOT_TOKEN|JARVIS_BRIDGE_TOKEN/);
  });

  it("keeps dashboard priority entirely dynamic", () => {
    const dashboard = source("app/(app)/dashboard/page.tsx");
    expect(dashboard).not.toMatch(/Mañana hay Quiz|martes 19 de agosto|ACTIVE_TEMA_COURSE_IDS|candidate-0289|candidate-0290/);
    expect(dashboard).toMatch(/prioritizedDeadlines/);
    expect(dashboard).toMatch(/splitTemaCourses/);
    expect(dashboard).toMatch(/temaData\.files\.length/);
  });
});
