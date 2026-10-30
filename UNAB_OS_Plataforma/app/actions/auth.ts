"use server";

import { cookies } from "next/headers";
import { normalizeInstitutionalEmail } from "@/lib/domain/academic-collaboration";
import { createAdminClient } from "@/lib/supabase/admin";

export async function directInstitutionalLogin(emailInput: string) {
  let cleaned = (emailInput || "").trim();
  if (cleaned && !cleaned.includes("@")) {
    cleaned = `${cleaned}@unab.edu.co`;
  }
  const email = normalizeInstitutionalEmail(cleaned);
  if (!email) return { error: "institutional-email-required" as const };

  const password = `UnabOS2026!_${email}`;

  try {
    const admin = createAdminClient();
    const { data: usersData, error: listError } = await admin.auth.admin.listUsers();
    if (!listError && usersData?.users) {
      const existingUser = usersData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        await admin.auth.admin.updateUserById(existingUser.id, {
          password,
          email_confirm: true,
        });
      } else {
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
      }
    }
  } catch (adminErr) {
    console.warn("Direct login admin bypass not available, proceeding with cookie:", adminErr);
  }

  try {
    const cookieStore = await cookies();
    cookieStore.set("uninova_user_email", email, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    cookieStore.delete("uninova_logged_out");
    console.log(`[AUTH LOGIN] ✅ Inicio de sesión institucional: ${email} | Fecha: ${new Date().toISOString()}`);
  } catch (cookieErr) {
    console.warn("Could not set user session cookie:", cookieErr);
  }

  return { success: true as const, email, password };
}

export async function exitInstitutionalSession() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("uninova_user_email");
    cookieStore.delete("uninova_demo_session");
    cookieStore.set("uninova_logged_out", "1", {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  } catch {
    // ignore
  }
  return { success: true as const };
}

export async function enterDemoSession() {
  const email = "user2@example.edu";
  const password = `UnabOS2026!_${email}`;

  try {
    const admin = createAdminClient();
    const { data: usersData, error: listError } = await admin.auth.admin.listUsers();
    if (!listError && usersData?.users) {
      const existingUser = usersData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        await admin.auth.admin.updateUserById(existingUser.id, {
          password,
          email_confirm: true,
          user_metadata: { full_name: "Compañero Invitado", name: "Compañero Invitado" },
        });
      } else {
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: "Compañero Invitado", name: "Compañero Invitado" },
        });
      }
    }
  } catch (adminErr) {
    console.warn("Direct demo admin bypass not available, proceeding with cookie fallback:", adminErr);
  }

  try {
    const cookieStore = await cookies();
    cookieStore.set("uninova_demo_session", "true", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });
  } catch (cookieErr) {
    console.warn("Could not set demo cookie:", cookieErr);
  }

  return { success: true as const, email, password };
}

export async function exitDemoSession() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("uninova_demo_session");
  } catch {
    // ignore
  }
  return { success: true as const };
}
