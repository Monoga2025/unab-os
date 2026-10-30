"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const NEUTRAL_SUCCESS = "Si existe una cuenta con ese correo, recibirás un enlace para crear una nueva contraseña.";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function submit(formData: FormData) {
    const email = formData.get("email");
    if (typeof email !== "string") return;

    setIsPending(true);
    setMessage(null);
    const supabase = createClient();
    const redirectTo = new URL("/auth/callback?next=/reset-password", window.location.origin).toString();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });

    setMessage(error
      ? "No pudimos procesar la solicitud ahora. Esperá unos minutos e intentá de nuevo."
      : NEUTRAL_SUCCESS);
    setIsPending(false);
  }

  return (
    <form className="auth-form" action={submit}>
      <label htmlFor="recovery-email">Correo electrónico</label>
      <input id="recovery-email" name="email" type="email" autoComplete="email" placeholder="nombre@universidad.edu" required />
      <button className="auth-submit" type="submit" disabled={isPending}>
        {isPending ? "Enviando…" : "Enviar enlace de recuperación"}
      </button>
      {message && <p className="auth-message" role="status" aria-live="polite">{message}</p>}
      <Link className="auth-text-link auth-back-link" href="/login">Volver a iniciar sesión</Link>
    </form>
  );
}
