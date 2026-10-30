import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function DELETE(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: userData, error } = await supabase.auth.getUser();
  const ownerId = userData?.user?.id;
  if (error || !ownerId) {
    return NextResponse.json({ error: "Inicia sesión otra vez." }, { status: 401 });
  }

  // tema_connections has no authenticated grant by design. This server-only
  // delete uses the verified JWT owner and never accepts an owner id from the
  // request body. Existing academic snapshots remain available as read-only
  // history, while the encrypted Moodle token is removed immediately.
  const { error: deleteError } = await createAdminClient()
    .from("tema_connections")
    .delete()
    .eq("owner_id", ownerId);

  if (deleteError) {
    return NextResponse.json({ error: "No pudimos desconectar TEMA ahora." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "TEMA quedó desconectado y eliminamos el token cifrado. Conservamos tu última captura académica.",
  }, { headers: { "Cache-Control": "no-store" } });
}
