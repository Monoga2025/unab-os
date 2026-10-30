import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();

    // 1. Limpiar membresías académicas de estudiantes
    await admin.from("section_memberships").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 2. Limpiar ítems y revisiones académicas creadas
    await admin.from("academic_item_revisions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await admin.from("academic_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 3. Limpiar conexiones y tokens de TEMA Moodle
    await admin.from("tema_connections").delete().neq("owner_id", "00000000-0000-0000-0000-000000000000");

    // 4. Limpiar snapshots de cursos/archivos TEMA de prueba
    await admin.from("tema_announcements").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await admin.from("tema_grade_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await admin.from("tema_files").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await admin.from("tema_activities").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await admin.from("tema_sections").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await admin.from("tema_courses").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 5. Limpiar sesiones de tutor, mensajes y pairings de Telegram de prueba
    await admin.from("tutor_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await admin.from("tutor_sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await admin.from("study_materials").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await admin.from("study_sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await admin.from("telegram_pairings").delete().neq("owner_id", "00000000-0000-0000-0000-000000000000");

    return NextResponse.json({
      ok: true,
      message: "Base de datos reseteada a estado limpio de fábrica (Clean Slate). Ningún usuario tiene materias ni conexiones activas.",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Error desconocido al resetear base de datos";
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
