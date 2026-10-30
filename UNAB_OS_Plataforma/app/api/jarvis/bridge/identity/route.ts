import {
  authorizeJarvisBridge,
  resolveJarvisBridgeIdentity,
  unauthorized,
  unlinked,
} from "@/lib/jarvis/cloud-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request): Promise<Response> {
  const authorization = authorizeJarvisBridge(request);
  if (!authorization) return unauthorized();
  try {
    const identity = await resolveJarvisBridgeIdentity(request, createAdminClient(), authorization);
    if (!identity) return unlinked();
    return Response.json({
      linked: true,
      ownerId: identity.ownerId,
      legacy: identity.legacy,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Telegram identity lookup failed." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
