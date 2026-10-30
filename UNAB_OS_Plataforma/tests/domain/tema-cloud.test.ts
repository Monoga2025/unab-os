import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("server-only", () => ({}));

import { loadCloudTemaData } from "@/lib/tema/cloud";

class Query {
  constructor(private readonly result: { data: unknown[]; error: null }) {}
  select() { return this; }
  eq() { return this; }
  order() { return this; }
  then(resolve: (value: { data: unknown[]; error: null }) => unknown) { return Promise.resolve(resolve(this.result)); }
}

function clientWithFiles(files: Record<string, unknown>[]) {
  const rows: Record<string, unknown[]> = {
    tema_courses: [{ id: "course-db", source_id: "2277", name: "Ondas", access_failed: false, starts_at: null, ends_at: null, last_access_at: null, active_state: "active" }],
    tema_sections: [{ id: "section-db", course_id: "course-db", source_id: "2", title: "Guías", position: 2 }],
    tema_activities: [{ id: "activity-db", course_id: "course-db", section_id: "section-db", source_id: "115071", name: "Guía", module_type: "resource", availability_text: [], candidate_names: [] }],
    tema_files: files,
    tema_grade_items: [],
    tema_announcements: [],
  };
  return {
    from(table: string) {
      return new Query({ data: rows[table] ?? [], error: null });
    },
  } as unknown as SupabaseClient;
}

function file(overrides: Record<string, unknown> = {}) {
  return {
    candidate_id: "candidate-0290",
    course_id: "course-db",
    section_id: "section-db",
    activity_id: "activity-db",
    activity_name: "Guía",
    file_name: "ondas.pdf",
    file_type: "file",
    content_type: "application/pdf",
    size_bytes: 126_882,
    sha256: "a".repeat(64),
    storage_object_name: "owner/tema/candidate-0290/ondas.pdf",
    extracted_text: "Movimiento armónico simple",
    text_extraction_status: "ready",
    ...overrides,
  };
}

describe("cloud TEMA text mapping", () => {
  it("maps extracted text into server-side TemaData", async () => {
    const data = await loadCloudTemaData(clientWithFiles([file()]), "owner");
    expect(data.files[0]).toMatchObject({
      extractedText: "Movimiento armónico simple",
      textExtractionStatus: "ready",
    });
  });

  it("fails closed to not_extracted for an unknown legacy status", async () => {
    const data = await loadCloudTemaData(clientWithFiles([file({ extracted_text: null, text_extraction_status: "unexpected" })]), "owner");
    expect(data.files[0]).toMatchObject({ extractedText: null, textExtractionStatus: "not_extracted" });
  });
});
