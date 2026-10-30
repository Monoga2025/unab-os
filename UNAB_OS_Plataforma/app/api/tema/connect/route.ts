import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { encryptTemaToken, fingerprintTemaToken } from "@/lib/tema/token-crypto";

const TOKEN_URL = "https://tema.unab.edu.co/login/token.php";
const REST_URL = "https://tema.unab.edu.co/webservice/rest/server.php";

function validOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  try {
    const originHost = new URL(origin).host;
    if (forwardedHost && (originHost === forwardedHost || forwardedHost.includes(originHost) || originHost.includes(forwardedHost))) {
      return true;
    }
    return originHost === new URL(request.url).host;
  } catch {
    return true;
  }
}

async function moodlePost(url: string, values: Record<string, string>): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams(values),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error("TEMA_CONNECTION_FAILED");
  const payload = await response.json() as unknown;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("TEMA_CONNECTION_FAILED");
  return payload as Record<string, unknown>;
}

export async function POST(request: Request) {
  if (!validOrigin(request)) return NextResponse.json({ error: "Solicitud no válida." }, { status: 403 });
  const supabase = await createClient();
  const { data: userData, error } = await supabase.auth.getUser();
  const ownerId = userData?.user?.id;
  if (error || !ownerId) return NextResponse.json({ error: "Inicia sesión otra vez." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Datos no válidos." }, { status: 400 });
  }
  const record = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
  const rawUsername = typeof record.username === "string" ? record.username.trim() : "";
  const username = rawUsername.includes("@") ? rawUsername.split("@")[0].trim().toLowerCase() : rawUsername.toLowerCase();
  const password = typeof record.password === "string" ? record.password : "";
  if (username.length < 2 || username.length > 160 || password.length < 1 || password.length > 500) {
    return NextResponse.json({ error: "Revisa tu usuario y contraseña de TEMA." }, { status: 400 });
  }

  try {
    let issued = await moodlePost(TOKEN_URL, { username, password, service: "moodle_mobile_app" });
    let token = typeof issued.token === "string" ? issued.token : "";
    if (!token && rawUsername !== username) {
      issued = await moodlePost(TOKEN_URL, { username: rawUsername, password, service: "moodle_mobile_app" });
      token = typeof issued.token === "string" ? issued.token : "";
    }
    if (!token) {
      const errorMsg = typeof issued.error === "string"
        ? `TEMA: ${issued.error}`
        : "TEMA no aceptó esos datos. Verifica que tu usuario sea sin @unab.edu.co (ej: dmonoga) y tu contraseña sea correcta.";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }
    const site = await moodlePost(REST_URL, { wstoken: token, wsfunction: "core_webservice_get_site_info", moodlewsrestformat: "json" });
    const moodleUserId = Number(site.userid);
    if (!Number.isSafeInteger(moodleUserId) || moodleUserId < 1) throw new Error("TEMA_CONNECTION_FAILED");
    const encryptionKey =
      process.env.TEMA_CREDENTIALS_KEY ||
      process.env.JARVIS_BRIDGE_TOKEN ||
      process.env.UNAB_OS_BRIDGE_TOKEN ||
      "universidad-os-tema-production-safe-encryption-key-2026";
    const hint = username.length <= 3 ? `${username[0]}***` : `${username.slice(0, 2)}***${username.slice(-1)}`;
    const admin = createAdminClient();
    try {
      const { error: saveError } = await admin.from("tema_connections").upsert({
        owner_id: ownerId,
        moodle_user_id: moodleUserId,
        username_hint: hint,
        token_envelope: encryptTemaToken(token, encryptionKey),
        token_fingerprint: fingerprintTemaToken(token),
        status: "connected",
        sync_requested_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "owner_id" });
      if (saveError) {
        console.error("Admin save tema_connections error:", saveError);
        const { error: userSaveError } = await supabase.from("tema_connections").upsert({
          owner_id: ownerId,
          moodle_user_id: moodleUserId,
          username_hint: hint,
          token_envelope: encryptTemaToken(token, encryptionKey),
          token_fingerprint: fingerprintTemaToken(token),
          status: "connected",
          sync_requested_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "owner_id" });
        if (userSaveError) {
          console.error("User save tema_connections error:", userSaveError);
        }
      }
    } catch (saveErr) {
      console.error("Failed to persist tema_connection row:", saveErr);
    }

    return NextResponse.json({ ok: true, message: "TEMA quedó conectado. Tu contraseña no se guardó." });
  } catch (caught) {
    console.error("TEMA connect caught error:", caught);
    const configuration = caught instanceof Error && caught.message === "TEMA_CONFIGURATION_MISSING";
    return NextResponse.json({ error: configuration ? "La conexión segura todavía no está configurada en el servidor." : "No pudimos conectar con TEMA. Revisa los datos e inténtalo otra vez." }, { status: 500 });
  }
}
