import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TemaData } from "./data";

type Row = Record<string, unknown>;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value as Row[] : [];
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value) throw new Error(`Invalid cloud TEMA ${label}.`);
  return value;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
}

export async function loadCloudTemaData(supabase: SupabaseClient, ownerId: string): Promise<TemaData> {
  const [coursesResult, sectionsResult, activitiesResult, filesResult, gradesResult, announcementsResult] = await Promise.all([
    supabase.from("tema_courses").select("id,source_id,name,short_name,official_url,summary_text,category_name,progress_percent,access_failed,starts_at,ends_at,last_access_at,active_state").eq("owner_id", ownerId).eq("catalog_visible", true).order("name"),
    supabase.from("tema_sections").select("id,course_id,source_id,title,position").eq("owner_id", ownerId).eq("catalog_visible", true).order("position"),
    supabase.from("tema_activities").select("id,course_id,section_id,source_id,name,module_type,official_url,description_text,visible,availability_text,candidate_names,opens_at,due_at,completion_state").eq("owner_id", ownerId).eq("catalog_visible", true),
    supabase.from("tema_files").select("candidate_id,course_id,section_id,activity_id,activity_name,file_name,file_type,content_type,size_bytes,sha256,storage_object_name,extracted_text,text_extraction_status").eq("owner_id", ownerId).eq("catalog_visible", true),
    supabase.from("tema_grade_items").select("source_id,course_id,item_name,item_type,module_type,grade_display,grade_raw,grade_min,grade_max,feedback_text,graded_at,official_url").eq("owner_id", ownerId).eq("catalog_visible", true),
    supabase.from("tema_announcements").select("source_id,course_id,title,excerpt,author_name,posted_at,official_url").eq("owner_id", ownerId).eq("catalog_visible", true).order("posted_at", { ascending: false }),
  ]);
  for (const result of [coursesResult, sectionsResult, activitiesResult, filesResult, gradesResult, announcementsResult]) {
    if (result.error) throw new Error(`Cloud TEMA query failed: ${result.error.message}`);
  }

  const courseRows = rows(coursesResult.data);
  const sectionRows = rows(sectionsResult.data);
  const activityRows = rows(activitiesResult.data);
  const courseSourceById = new Map(courseRows.map((row) => [requiredString(row.id, "course id"), requiredString(row.source_id, "course source id")]));
  const sectionSourceById = new Map(sectionRows.map((row) => [requiredString(row.id, "section id"), requiredString(row.source_id, "section source id")]));
  const activitySourceById = new Map(activityRows.map((row) => [requiredString(row.id, "activity id"), requiredString(row.source_id, "activity source id")]));

  return Object.freeze({
    courses: Object.freeze(courseRows.map((row) => Object.freeze({
      id: requiredString(row.source_id, "course source id"),
      name: requiredString(row.name, "course name"),
      accessFailed: row.access_failed === true,
      startsAt: typeof row.starts_at === "string" ? row.starts_at : null,
      endsAt: typeof row.ends_at === "string" ? row.ends_at : null,
      lastAccessAt: typeof row.last_access_at === "string" ? row.last_access_at : null,
      activeState: row.active_state === "active" || row.active_state === "historical" ? row.active_state : "unknown",
      shortName: typeof row.short_name === "string" ? row.short_name : null,
      officialUrl: typeof row.official_url === "string" ? row.official_url : null,
      summaryText: typeof row.summary_text === "string" ? row.summary_text : null,
      categoryName: typeof row.category_name === "string" ? row.category_name : null,
      progressPercent: typeof row.progress_percent === "number" ? row.progress_percent : null,
    }))),
    sections: Object.freeze(sectionRows.map((row) => Object.freeze({
      id: requiredString(row.source_id, "section source id"),
      courseId: courseSourceById.get(requiredString(row.course_id, "section course id")) ?? "",
      title: requiredString(row.title, "section title"),
      order: Number(row.position),
    }))),
    activities: Object.freeze(activityRows.map((row) => Object.freeze({
      id: requiredString(row.source_id, "activity source id"),
      courseId: courseSourceById.get(requiredString(row.course_id, "activity course id")) ?? "",
      sectionId: sectionSourceById.get(requiredString(row.section_id, "activity section id")) ?? "",
      name: requiredString(row.name, "activity name"),
      moduleType: requiredString(row.module_type, "activity module type"),
      availabilityText: Object.freeze(stringArray(row.availability_text)),
      candidateNames: Object.freeze(stringArray(row.candidate_names)),
      opensAt: typeof row.opens_at === "string" ? row.opens_at : null,
      dueAt: typeof row.due_at === "string" ? row.due_at : null,
      completionState: row.completion_state === "pending" || row.completion_state === "submitted" || row.completion_state === "graded" ? row.completion_state : "unknown",
      officialUrl: typeof row.official_url === "string" ? row.official_url : null,
      descriptionText: typeof row.description_text === "string" ? row.description_text : null,
      visible: row.visible !== false,
    }))),
    files: Object.freeze(rows(filesResult.data).map((row) => Object.freeze({
      candidateId: requiredString(row.candidate_id, "candidate id"),
      courseId: courseSourceById.get(requiredString(row.course_id, "file course id")) ?? "",
      sectionId: sectionSourceById.get(requiredString(row.section_id, "file section id")) ?? "",
      activityName: requiredString(row.activity_name, "file activity name"),
      fileName: requiredString(row.file_name, "file name"),
      fileType: requiredString(row.file_type, "file type"),
      contentType: requiredString(row.content_type, "content type"),
      bytes: Number(row.size_bytes),
      sha256: requiredString(row.sha256, "sha256"),
      status: "downloaded" as const,
      // Cloud object names are identifiers, never filesystem paths.
      localRelativePath: requiredString(row.storage_object_name, "storage object name"),
      extractedText: typeof row.extracted_text === "string" ? row.extracted_text : null,
      textExtractionStatus: row.text_extraction_status === "ready"
        || row.text_extraction_status === "ocr_needed"
        || row.text_extraction_status === "unsupported"
        || row.text_extraction_status === "failed"
        ? row.text_extraction_status
        : "not_extracted",
      activityId: typeof row.activity_id === "string" ? activitySourceById.get(row.activity_id) ?? null : null,
    }))),
    grades: Object.freeze(rows(gradesResult.data).map((row) => Object.freeze({
      id: requiredString(row.source_id, "grade source id"),
      courseId: courseSourceById.get(requiredString(row.course_id, "grade course id")) ?? "",
      name: requiredString(row.item_name, "grade name"),
      itemType: requiredString(row.item_type, "grade item type"),
      moduleType: typeof row.module_type === "string" ? row.module_type : null,
      gradeDisplay: typeof row.grade_display === "string" ? row.grade_display : null,
      gradeRaw: typeof row.grade_raw === "number" ? row.grade_raw : null,
      gradeMin: typeof row.grade_min === "number" ? row.grade_min : null,
      gradeMax: typeof row.grade_max === "number" ? row.grade_max : null,
      feedbackText: typeof row.feedback_text === "string" ? row.feedback_text : null,
      gradedAt: typeof row.graded_at === "string" ? row.graded_at : null,
      officialUrl: typeof row.official_url === "string" ? row.official_url : null,
    }))),
    announcements: Object.freeze(rows(announcementsResult.data).map((row) => Object.freeze({
      id: requiredString(row.source_id, "announcement source id"),
      courseId: courseSourceById.get(requiredString(row.course_id, "announcement course id")) ?? "",
      title: requiredString(row.title, "announcement title"),
      excerpt: typeof row.excerpt === "string" ? row.excerpt : null,
      authorName: typeof row.author_name === "string" ? row.author_name : null,
      postedAt: typeof row.posted_at === "string" ? row.posted_at : null,
      officialUrl: requiredString(row.official_url, "announcement official url"),
    }))),
  });
}
