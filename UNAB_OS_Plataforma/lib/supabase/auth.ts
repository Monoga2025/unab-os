import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { normalizeInstitutionalEmail } from "@/lib/domain/academic-collaboration";
import { createClient } from "./server";

export function emailToDeterministicUuid(email: string): string {
  const norm = email.toLowerCase().trim();
  if (norm === "user2@example.edu") return "00000000-0000-0000-0000-000000000001";
  if (norm === "user6@example.edu") return "00000000-0000-0000-0000-000000000002";

  const hash = createHash("sha256").update(norm).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export async function getInstitutionalUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const email = normalizeInstitutionalEmail(user.email ?? "");
    if (!email) {
      await supabase.auth.signOut({ scope: "local" });
      redirect("/login?error=institutional-email-required");
    }
    return { supabase, userId: user.id, email };
  }

  // Fallback con sesión persistente recordada
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();

    const rawSaved = cookieStore.get("uninova_user_email")?.value;
    if (rawSaved) {
      let savedEmailCookie = rawSaved;
      try {
        savedEmailCookie = decodeURIComponent(rawSaved);
      } catch {
        // ignore
      }
      const normSaved = normalizeInstitutionalEmail(savedEmailCookie);
      if (normSaved) {
        return {
          supabase,
          userId: emailToDeterministicUuid(normSaved),
          email: normSaved,
        };
      }
    }

    if (cookieStore.get("uninova_demo_session")?.value === "true") {
      return {
        supabase,
        userId: "00000000-0000-0000-0000-000000000001",
        email: "user2@example.edu",
      };
    }
  } catch {
    // Contextos sin cookies de request
  }

  return null;
}

export async function requireInstitutionalUser() {
  const user = await getInstitutionalUser();
  if (user) {
    return user;
  }

  // Redirigir al login si no hay sesión institucional activa
  redirect("/login");
}

export async function requireUser() {
  return requireInstitutionalUser();
}

