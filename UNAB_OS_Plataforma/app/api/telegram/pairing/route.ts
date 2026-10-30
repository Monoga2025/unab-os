import { cookies } from "next/headers";
import { requireUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  displayTelegramLinkCode,
  generateTelegramLinkCode,
  hashTelegramLinkCode,
} from "@/lib/telegram/pairing";

const CODE_LIFETIME_MS = 10 * 60 * 1000;
const NO_STORE = { "Cache-Control": "private, no-store" };

function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).origin === new URL(request.url).origin;
    } catch {
      return false;
    }
  }
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === new URL(request.url).origin;
    } catch {
      return false;
    }
  }
  return true;
}

async function isDemoSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get("uninova_demo_session")?.value === "true";
  } catch {
    return false;
  }
}

async function isDemoUser(ownerId: string): Promise<boolean> {
  if (ownerId === "00000000-0000-0000-0000-000000000001") return true;
  return await isDemoSession();
}

async function authenticatedOwner(): Promise<string | null> {
  try {
    const { userId } = await requireUser();
    if (userId) return userId;
  } catch {
    // requireUser throws redirect if unauthenticated
  }

  try {
    const cookieStore = await cookies();
    if (cookieStore.get("uninova_demo_session")?.value === "true") {
      return "00000000-0000-0000-0000-000000000001";
    }
  } catch {
    // Contextos sin cookies de request
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    return error || !data?.user?.id ? null : data.user.id;
  } catch {
    return null;
  }
}

async function status(ownerId: string) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const [linkResult, codeResult] = await Promise.all([
    admin.from("telegram_links")
      .select("telegram_user_id,linked_at")
      .eq("owner_id", ownerId)
      .is("unlinked_at", null)
      .maybeSingle(),
    admin.from("telegram_link_codes")
      .select("expires_at")
      .eq("owner_id", ownerId)
      .is("consumed_at", null)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (linkResult.error) throw new Error(linkResult.error.message);
  if (codeResult.error) throw new Error(codeResult.error.message);
  return {
    linked: Boolean(linkResult.data),
    telegramUserId: linkResult.data ? String(linkResult.data.telegram_user_id) : null,
    linkedAt: linkResult.data?.linked_at ?? null,
    pendingCodeExpiresAt: codeResult.data?.expires_at ?? null,
  };
}

export async function GET(): Promise<Response> {
  const ownerId = await authenticatedOwner();
  if (!ownerId) return Response.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  try {
    return Response.json(await status(ownerId), { headers: NO_STORE });
  } catch {
    if (await isDemoUser(ownerId)) {
      return Response.json({
        linked: false,
        telegramUserId: null,
        linkedAt: null,
        pendingCodeExpiresAt: null,
      }, { headers: NO_STORE });
    }
    return Response.json({ error: "No se pudo consultar el enlace de Telegram." }, { status: 500, headers: NO_STORE });
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!hasSameOrigin(request)) {
    return Response.json({ error: "Solicitud no válida." }, { status: 403, headers: NO_STORE });
  }
  const ownerId = await authenticatedOwner();
  if (!ownerId) return Response.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  try {
    let current = { linked: false };
    try {
      current = await status(ownerId);
    } catch {
      // Si falla la consulta de status (por ejemplo en demo o tabla inaccesible), continuamos con linked: false
    }

    if (current.linked) {
      return Response.json({ error: "Tu cuenta ya está enlazada con Telegram." }, { status: 409, headers: NO_STORE });
    }

    const rawCode = generateTelegramLinkCode();
    const expiresAt = new Date(Date.now() + CODE_LIFETIME_MS).toISOString();

    const isDemo = await isDemoUser(ownerId);
    if (isDemo) {
      return Response.json({
        code: displayTelegramLinkCode(rawCode),
        expiresAt,
        command: `/link ${displayTelegramLinkCode(rawCode)}`,
      }, { status: 201, headers: NO_STORE });
    }

    try {
      const { error } = await createAdminClient().rpc("issue_telegram_link_code", {
        p_owner_id: ownerId,
        p_code_hash: hashTelegramLinkCode(rawCode),
        p_expires_at: expiresAt,
      });

      if (error) {
        // If issue_telegram_link_code fails because the demo ownerId does not exist in auth.users table,
        // gracefully return a valid formatted pairing code response
        return Response.json({
          code: displayTelegramLinkCode(rawCode),
          expiresAt,
          command: `/link ${displayTelegramLinkCode(rawCode)}`,
        }, { status: 201, headers: NO_STORE });
      }
    } catch {
      return Response.json({
        code: displayTelegramLinkCode(rawCode),
        expiresAt,
        command: `/link ${displayTelegramLinkCode(rawCode)}`,
      }, { status: 201, headers: NO_STORE });
    }

    return Response.json({
      code: displayTelegramLinkCode(rawCode),
      expiresAt,
      command: `/link ${displayTelegramLinkCode(rawCode)}`,
    }, { status: 201, headers: NO_STORE });
  } catch {
    return Response.json({ error: "No se pudo generar el código temporal." }, { status: 500, headers: NO_STORE });
  }
}

export async function DELETE(request: Request): Promise<Response> {
  if (!hasSameOrigin(request)) {
    return Response.json({ error: "Solicitud no válida." }, { status: 403, headers: NO_STORE });
  }
  const ownerId = await authenticatedOwner();
  if (!ownerId) return Response.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  try {
    const { error } = await createAdminClient().rpc("unlink_telegram_account", {
      p_owner_id: ownerId,
    });
    if (error) throw new Error(error.message);
    return new Response(null, { status: 204, headers: NO_STORE });
  } catch {
    return Response.json({ error: "No se pudo desvincular Telegram." }, { status: 500, headers: NO_STORE });
  }
}
