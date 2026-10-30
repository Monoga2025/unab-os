import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const migration = source("supabase/migrations/20260824171100_connect_tema_study_progress.sql");
const workspaceMigration = source("supabase/migrations/20260824233643_tema_full_course_workspace.sql");
const sourceMetadataMigration = source("supabase/migrations/20260825153043_tema_course_source_metadata.sql");
const atomicSnapshotMigration = source("supabase/migrations/20260825153855_atomic_tema_snapshot_publish.sql");
const textExtractionMigration = source("supabase/migrations/20260826210000_tema_file_text_extraction.sql");
const synchronizer = source("scripts/sync_tema_cloud.py");
const scheduler = source("scripts/tema_sync_schedule.py");
const fileIdentity = source("scripts/tema_file_identity.py");
const railway = source("railway.tema-sync.json");

describe("daily TEMA synchronization contract", () => {
  it("links sessions, resources and handoffs with composite owner foreign keys", () => {
    expect(migration).toMatch(/foreign key \(tema_course_id, user_id\)[\s\S]*?tema_courses\(id, owner_id\)/);
    expect(migration).toMatch(/foreign key \(tema_activity_id, user_id\)[\s\S]*?tema_activities\(id, owner_id\)/);
    expect(migration).toMatch(/foreign key \(session_id, user_id\)[\s\S]*?study_sessions\(id, user_id\)/);
    expect(migration).toMatch(/foreign key \(file_id, user_id\)[\s\S]*?tema_files\(id, owner_id\)/);
    expect(migration).toMatch(/foreign key \(study_session_id, owner_id\)[\s\S]*?study_sessions\(id, user_id\)/);
  });

  it("enforces RLS and exposes only the authenticated user's new rows", () => {
    for (const table of ["tema_sync_runs", "study_session_tema_files"]) {
      expect(migration).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    }
    expect(migration).toMatch(/\(select auth\.uid\(\)\) = owner_id/);
    expect(migration).toMatch(/\(select auth\.uid\(\)\) = user_id/);
    expect(migration).toMatch(/grant select on public\.tema_sync_runs to authenticated/);
  });

  it("uses official Moodle APIs, stages downloads and preserves last-good data on failure", () => {
    expect(synchronizer).toMatch(/core_enrol_get_users_courses/);
    expect(synchronizer).toMatch(/core_course_get_contents/);
    expect(synchronizer).toMatch(/TemporaryDirectory/);
    expect(synchronizer).toMatch(/parsed\.netloc != "tema\.unab\.edu\.co"/);
    expect(synchronizer).toMatch(/MAX_FILE_BYTES/);
    expect(synchronizer).toMatch(/hashlib\.sha256/);
    expect(synchronizer).toMatch(/by_sha/);
    expect(synchronizer).toContain("last-good catalog preserved");
    expect(synchronizer).toMatch(/response\.status_code/);
    expect(synchronizer).not.toMatch(/response\.status(?!_code)/);
    expect(synchronizer).not.toMatch(/puppeteer|playwright|selenium|scrap(?:e|ing)/i);
  });

  it("polls cheaply for due connections and keeps TEMA token out of code", () => {
    expect(JSON.parse(railway)).toMatchObject({ deploy: { cronSchedule: "*/10 * * * *", restartPolicyType: "NEVER" } });
    expect(source("Dockerfile.tema-sync")).toMatch(/python:3\.12-/);
    expect(synchronizer).toMatch(/os\.getenv\("TEMA_TOKEN"\)/);
    expect(synchronizer).toMatch(/connection_due\(row, force=force\)/);
    expect(synchronizer).toMatch(/token_fingerprint,sync_requested_at,last_synced_at,last_attempted_at/);
    expect(scheduler).toContain('ZoneInfo("America/Bogota")');
    expect(scheduler).toMatch(/hour=5, minute=0/);
    expect(scheduler).toMatch(/requested > last_synced/);
    expect(scheduler).toMatch(/RETRY_BACKOFF = timedelta\(hours=1\)/);
    expect(synchronizer).toMatch(/direct_owner and direct_token and force/);
    expect(synchronizer).toMatch(/"last_attempted_at": captured_at/);
    expect(synchronizer).toMatch(/"last_attempted_at": f"eq\.\{captured_at\}"/);
    expect(synchronizer).not.toMatch(/TEMA_TOKEN\s*=\s*["'][^"']+["']/);
  });

  it("stores a complete read-only workspace and keeps token envelopes server-only", () => {
    for (const table of ["tema_grade_items", "tema_announcements", "tema_connections"]) {
      expect(workspaceMigration).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    }
    expect(workspaceMigration).toMatch(/revoke all on public\.tema_connections from anon, authenticated/);
    expect(workspaceMigration).not.toMatch(/grant\s+(select|all)[^;]*on\s+public\.tema_connections\s+to\s+authenticated/i);
    expect(synchronizer).toMatch(/gradereport_user_get_grade_items/);
    expect(synchronizer).toMatch(/mod_forum_get_forum_discussions_paginated/);
    expect(synchronizer).toMatch(/grade_display/);
    expect(synchronizer).toMatch(/core_course_get_courses_by_field/);
    expect(synchronizer).toMatch(/core_course_get_enrolled_courses_by_timeline_classification/);
    expect(synchronizer).toMatch(/classification="inprogress"/);
    expect(synchronizer).toMatch(/RECENT_ACCESS_SECONDS/);
    expect(synchronizer).toMatch(/CURRENT_TERM_START_SECONDS/);
    expect(synchronizer).toMatch(/category_name/);
    expect(synchronizer).toMatch(/progress_percent/);
    expect(synchronizer).toMatch(/stable_candidate_id\(module\["id"\], item\)/);
    expect(fileIdentity).toMatch(/pluginfile_path/);
    expect(fileIdentity).not.toMatch(/\bindex\b/);
    expect(synchronizer).not.toMatch(/normalized_grade|clamp_grade/);
  });

  it("preserves official category and progress without calculating them", () => {
    expect(sourceMetadataMigration).toMatch(/add column category_name text/);
    expect(sourceMetadataMigration).toMatch(/add column progress_percent numeric\(5,2\)/);
    expect(sourceMetadataMigration).toMatch(/progress_percent between 0 and 100/);
    expect(source("lib/tema/cloud.ts")).toMatch(/category_name,progress_percent/);
    expect(source("lib/tema/cloud.ts")).toMatch(/categoryName:/);
    expect(source("lib/tema/cloud.ts")).toMatch(/progressPercent:/);
  });

  it("publishes the live catalog atomically and idempotently", () => {
    for (const table of ["courses", "sections", "activities", "files", "grade_items", "announcements"]) {
      expect(atomicSnapshotMigration).toMatch(new RegExp(`alter table public\\.tema_${table} add column catalog_visible`));
    }
    expect(atomicSnapshotMigration).toMatch(/create or replace function public\.publish_tema_snapshot/);
    expect(atomicSnapshotMigration).toMatch(/security invoker/);
    expect(atomicSnapshotMigration).toMatch(/TEMA snapshot row owner mismatch/);
    expect(atomicSnapshotMigration).toMatch(/TEMA connection was revoked or replaced/);
    expect(atomicSnapshotMigration).toMatch(/newer TEMA capture is already published/);
    expect(atomicSnapshotMigration).toMatch(/TEMA publish status does not match snapshot completeness/);
    expect(atomicSnapshotMigration).toMatch(/now\(\) \+ interval '5 minutes'/);
    expect(atomicSnapshotMigration).toMatch(/connection\.token_fingerprint = p_token_fingerprint/);
    expect(atomicSnapshotMigration).toMatch(/for update/);
    expect(atomicSnapshotMigration).toMatch(/jsonb_typeof\(p_courses\) is distinct from 'array'/);
    expect(atomicSnapshotMigration).toMatch(/p_complete_scopes jsonb/);
    for (const scope of ["courses", "sections", "activities", "files", "grades", "announcements"]) {
      expect(atomicSnapshotMigration).toContain(`(p_complete_scopes->>'${scope}')::boolean`);
    }
    expect(atomicSnapshotMigration).toMatch(/catalog_visible = false/);
    expect(atomicSnapshotMigration).toMatch(/A child can never remain in the live catalog/);
    expect(atomicSnapshotMigration).toMatch(/not course\.catalog_visible/);
    for (const operation of ["read", "insert", "update", "delete"]) {
      expect(atomicSnapshotMigration).toContain(`drop policy if exists "${operation} own private tema objects"`);
    }
    expect(atomicSnapshotMigration.match(/on conflict \(/g)?.length).toBe(6);
    expect(atomicSnapshotMigration).toMatch(/revoke all on function public\.publish_tema_snapshot[\s\S]*from public, anon, authenticated/);
    expect(atomicSnapshotMigration).toMatch(/grant execute on function public\.publish_tema_snapshot[\s\S]*to service_role/);
    expect(synchronizer).toMatch(/db\.rpc\("publish_tema_snapshot"/);
    expect(synchronizer).toMatch(/"p_complete_scopes":/);
    expect(synchronizer).not.toMatch(/db\.upsert\("tema_/);
    expect(synchronizer.indexOf('db.rpc("publish_tema_snapshot"')).toBeGreaterThan(synchronizer.indexOf("TemporaryDirectory"));
  });

  it("enriches file text after publish without making OCR or extraction failure authoritative", () => {
    expect(textExtractionMigration).toMatch(/add column extracted_text text/);
    expect(textExtractionMigration).toMatch(/not_extracted.*ready.*ocr_needed.*unsupported.*failed/s);
    expect(textExtractionMigration).toMatch(/reset_tema_file_text_on_digest_change/);
    expect(source("Dockerfile.tema-sync")).toMatch(/poppler-utils/);
    expect(synchronizer).toMatch(/subprocess\.run\([\s\S]*?shell=False/);
    expect(synchronizer).toMatch(/MAX_EXTRACTED_TEXT_CHARS = 24_000/);
    expect(synchronizer.indexOf('db.patch("tema_files"')).toBeGreaterThan(synchronizer.indexOf('db.rpc("publish_tema_snapshot"'));
    expect(synchronizer).toMatch(/owner_id[\s\S]*?candidate_id[\s\S]*?sha256/);
    expect(synchronizer).toContain("Never invalidate the published catalog");
    expect(source("lib/tema/cloud.ts")).toMatch(/extracted_text,text_extraction_status/);
  });

  it("keeps partial failures out of live rows and filters every live reader", () => {
    expect(synchronizer).toContain("last-good catalog preserved");
    expect(synchronizer).toMatch(/except Exception as error:[\s\S]*?tema_sync_runs[\s\S]*?status": "failed"/);
    for (const path of [
      "lib/tema/cloud.ts",
      "lib/jarvis/cloud.ts",
      "app/api/jarvis/bridge/catalog/route.ts",
      "app/api/jarvis/bridge/handoffs/route.ts",
      "app/actions/jarvis.ts",
      "app/(app)/progress/page.tsx",
    ]) {
      expect(source(path)).toContain('.eq("catalog_visible", true)');
    }
  });
});
