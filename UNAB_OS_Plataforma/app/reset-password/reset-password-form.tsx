"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function submit(formData: FormData) {
    const password = formData.get("password");
    const confirmation = formData.get("passwordConfirmation");
    if (typeof password !== "string" || typeof confirmation !== "string") return;

    if (password.length < 8) {
      setMessage("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }

    setIsPending(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage("No pudimos actualizar la contraseña. Solicitá un enlace nuevo e intentá otra vez.");
      setIsPending(false);
      return;
    }

    await supabase.auth.signOut();
    window.location.assign("/login?reset=success");
  }

  return (
    <form className="auth-form" action={submit}>
      <label htmlFor="new-password">Nueva contraseña</label>
      <input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} placeholder="Mínimo 8 caracteres" required />
      <label htmlFor="password-confirmation">Confirmar contraseña</label>
      <input id="password-confirmation" name="passwordConfirmation" type="password" autoComplete="new-password" minLength={8} placeholder="Repetí la contraseña" required />
      <button className="auth-submit" type="submit" disabled={isPending}>
        {isPending ? "Actualizando…" : "Guardar nueva contraseña"}
      </button>
      {message && <p className="auth-message" role="status" aria-live="polite">{message}</p>}
    </form>
  );
}
