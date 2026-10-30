import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const migration = source("supabase/migrations/20260825161724_jarvis_handoff_document_snapshot.sql");
const cloud = source("lib/jarvis/cloud.ts");
const claim = source("app/api/jarvis/bridge/claim/route.ts");
const queue = source("app/api/jarvis/bridge/handoffs/route.ts");
const document = source("app/api/jarvis/bridge/handoffs/[handoffId]/document/route.ts");
const progress = source("app/(app)/progress/page.tsx");
const catalog = source("app/api/jarvis/bridge/catalog/route.ts");

describe("immutable Jarvis handoff document snapshots", () => {
  it("backfills and constrains the exact owned PDF evidence", () => {
    for (const column of [
      "tema_course_id",
      "document_storage_bucket",
      "document_storage_object_name",
      "document_file_name",
      "document_content_type",
      "document_size_bytes",
      "document_sha256",
    ]) {
      expect(migration).toContain(`add column ${column}`);
      expect(migration).toContain(`alter column ${column} set not null`);
    }
    expect(migration).toMatch(/from public\.tema_files file[\s\S]*?file\.id = handoff\.file_id[\s\S]*?file\.owner_id = handoff\.owner_id/);
    expect(migration).toMatch(/foreign key \(tema_course_id, owner_id\)[\s\S]*?references public\.tema_courses\(id, owner_id\)/);
    expect(migration).toMatch(/document_storage_bucket = 'tema-private'/);
    expect(migration).toMatch(/document_size_bytes between 1 and 10000000/);
    expect(migration).toMatch(/document_sha256 ~ '\^\[0-9a-f\]\{64\}\$'/);
    expect(migration).toMatch(/jarvis_handoffs_snapshot_course_idx/);
  });

  it("rejects later snapshot mutation and only accepts an exact visible owned file", () => {
    expect(migration).toMatch(/create trigger jarvis_handoffs_document_snapshot_immutable[\s\S]*?before update/);
    for (const column of [
      "tema_course_id",
      "document_storage_bucket",
      "document_storage_object_name",
      "document_file_name",
      "document_content_type",
      "document_size_bytes",
      "document_sha256",
    ]) {
      expect(migration).toMatch(new RegExp(`new\\.${column} is distinct from old\\.${column}`));
      expect(migration).toMatch(new RegExp(`file\\.[a-z0-9_]+ = public\\.jarvis_study_handoffs\\.${column}`));
    }
    expect(migration).toMatch(/file\.catalog_visible/);
    expect(migration).toMatch(/file\.content_type = 'application\/pdf'/);
    expect(migration).toMatch(/link\.unlinked_at is null/);
  });

  it("captures the snapshot when either dashboard or Jarvis queues a handoff", () => {
    expect(cloud).toMatch(/temaFileSnapshotSelect[\s\S]*?snapshotTemaFile\(file/);
    expect(queue).toMatch(/select\(temaFileSnapshotSelect\)[\s\S]*?snapshotTemaFile\(file/);
    expect(cloud).not.toMatch(/tema_files\(storage_bucket/);
  });

  it("claims and delivers only the frozen object and verifies its digest", () => {
    expect(claim).toMatch(/document_storage_bucket[\s\S]*?document_sha256/);
    expect(claim).not.toMatch(/tema_files\(/);
    expect(document).toMatch(/select\("status,document_storage_bucket,[^"]*document_sha256"\)/);
    expect(document).toMatch(/createHash\("sha256"\)/);
    expect(document).toMatch(/timingSafeEqual/);
    expect(document).not.toMatch(/tema_files\(/);
  });

  it("uses the frozen course in Progress without exposing private evidence in catalog", () => {
    expect(progress).toMatch(/admin\.from\("jarvis_study_handoffs"\)\.select\("id,status,created_at,delivered_at,tema_course_id"\)/);
    expect(progress).not.toMatch(/tema_files\(course_id\)/);
    expect(catalog).not.toMatch(/sha256|storage_bucket|storage_object_name|document_sha256|document_storage/);
  });
});
