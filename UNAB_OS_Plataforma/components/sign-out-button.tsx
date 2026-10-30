"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({
  className,
  onSignedOut,
}: {
  className?: string;
  onSignedOut?: () => void;
}) {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await createClient().auth.signOut({ scope: "local" });
    } catch {
      // ignore network errors
    }

    // 1. Remove all authorization cookies
    document.cookie = "uninova_user_email=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "uninova_demo_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "uninova_logged_out=1; path=/; max-age=86400; SameSite=Lax";

    // 2. Clear local storage authentication items
    try {
      localStorage.removeItem("uninova_user_email");
      localStorage.removeItem("uninova_logged_in");
      localStorage.removeItem("uninova_user_session");
      localStorage.removeItem("uninova_demo");
      localStorage.setItem("uninova_logged_out", "1");
    } catch {
      // ignore
    }

    onSignedOut?.();
    window.location.replace("/login");
  }

  return (
    <button
      className={className || "app-sign-out"}
      type="button"
      onClick={signOut}
      disabled={pending}
      aria-label="Cerrar sesión"
      title="Cerrar sesión"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
      </svg>
      <span>{pending ? "Cerrando sesión…" : "Cerrar sesión"}</span>
    </button>
  );
}
