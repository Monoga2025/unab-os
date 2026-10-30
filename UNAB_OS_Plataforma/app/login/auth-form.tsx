"use client";

import { useState } from "react";
import { directInstitutionalLogin } from "@/app/actions/auth";
import { normalizeInstitutionalEmail } from "@/lib/domain/academic-collaboration";
import { createClient } from "@/lib/supabase/client";

const INSTITUTIONAL_EMAIL_GUIDANCE = "Usá tu correo institucional @unab.edu.co.";

export function deriveInternalEmailPassword(email: string): string {
  return `UnabOS2026!_${email.toLowerCase().trim()}`;
}

export type DirectAuthClient = {
  auth: {
    signInWithPassword(input: { email: string; password: string }): Promise<{ data: { session: unknown } | null; error: unknown }>;
    signUp(input: { email: string; password: string }): Promise<{ data: { session: unknown; user: unknown } | null; error: unknown }>;
    signInWithOtp?(input: { email: string; options: { emailRedirectTo: string } }): Promise<{ error: unknown }>;
  };
};

export async function authenticateDirectInstitutionalEmail({
  client,
  email,
  origin,
}: {
  client: DirectAuthClient;
  email: string;
  origin?: string;
}): Promise<"invalid" | "failed" | "success" | "sent"> {
  const normalizedEmail = normalizeInstitutionalEmail(email);
  if (!normalizedEmail) return "invalid";

  const password = deriveInternalEmailPassword(normalizedEmail);

  // 1. Intentar sign in directo
  const signInResult = await client.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (signInResult.data?.session) {
    return "success";
  }

  // 2. Si no existe, crear la cuenta automáticamente
  const signUpResult = await client.auth.signUp({
    email: normalizedEmail,
    password,
  });

  if (signUpResult.data?.session) {
    return "success";
  }

  // 3. Reintentar sign in
  const retryResult = await client.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (retryResult.data?.session) {
    return "success";
  }

  // 4. Fallback a enlace si el proyecto tuviera confirmación obligatoria estricta
  if (client.auth.signInWithOtp && origin) {
    const redirectTo = new URL("/auth/callback?next=/materias", origin).toString();
    const { error } = await client.auth.signInWithOtp({
      email: normalizedEmail,
      options: { emailRedirectTo: redirectTo },
    });
    if (!error) return "sent";
  }

  return "failed";
}

export async function requestInstitutionalMagicLink({
  client,
  email,
  origin,
}: {
  client: { auth: { signInWithOtp(input: { email: string; options: { emailRedirectTo: string } }): Promise<{ error: unknown }> } };
  email: string;
  origin: string;
}): Promise<"invalid" | "failed" | "sent"> {
  const normalizedEmail = normalizeInstitutionalEmail(email);
  if (!normalizedEmail) return "invalid";

  const redirectTo = new URL("/auth/callback?next=/materias", origin).toString();
  const { error } = await client.auth.signInWithOtp({
    email: normalizedEmail,
    options: { emailRedirectTo: redirectTo },
  });
  return error ? "failed" : "sent";
}

export function AuthForm({ initialMessage = null }: { initialMessage?: string | null }) {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState<string | null>(initialMessage);
  const [isPending, setIsPending] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.includes("@")) {
      setUsername(val.split("@")[0].trim().toLowerCase());
    } else {
      setUsername(val.trim().toLowerCase());
    }
  };

  async function submit(formData: FormData) {
    const rawInput = (formData.get("username") as string) || username;
    if (!rawInput.trim()) return;

    const fullEmail = rawInput.includes("@") ? rawInput.trim().toLowerCase() : `${rawInput.trim().toLowerCase()}@unab.edu.co`;

    setIsPending(true);
    setMessage(null);

    const actionRes = await directInstitutionalLogin(fullEmail);
    if ("error" in actionRes && actionRes.error === "institutional-email-required") {
      setMessage(INSTITUTIONAL_EMAIL_GUIDANCE);
      setIsPending(false);
      return;
    }

    const client = createClient();
    const normalizedEmail = actionRes.email!;
    const password = actionRes.password!;

    // Intentar sign in directo
    const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (signInData?.session) {
      window.location.assign("/dashboard");
      return;
    }

    // Si falló el sign in, intentar signUp
    const { data: signUpData, error: signUpError } = await client.auth.signUp({
      email: normalizedEmail,
      password,
    });

    if (signUpData?.session) {
      window.location.assign("/dashboard");
      return;
    }

    // Reintentar sign in
    const { data: retryData, error: retryError } = await client.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (retryData?.session) {
      window.location.assign("/dashboard");
      return;
    }

    const failureReason = signInError?.message || signUpError?.message || retryError?.message || "No se pudo iniciar sesión.";
    setMessage(`Error de acceso: ${failureReason}`);
    setIsPending(false);
  }

  return (
    <div className="auth-control">
      <form className="auth-form" action={submit}>
        <label htmlFor="auth-email" style={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.9rem", display: "block", marginBottom: "8px" }}>
          Usuario institucional UNAB
        </label>
        
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "#0f172a",
            border: "1.5px solid rgba(56, 189, 248, 0.45)",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
            marginBottom: "16px",
            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          }}
        >
          <input
            id="auth-email"
            name="username"
            type="text"
            autoComplete="username"
            placeholder="tu_usuario (ej. c.perez)"
            value={username}
            onChange={handleInputChange}
            required
            autoFocus
            style={{
              flex: 1,
              height: "48px",
              padding: "0 16px",
              background: "transparent",
              border: "none",
              color: "#ffffff",
              fontSize: "1rem",
              fontWeight: 600,
              outline: "none",
            }}
          />
          <div
            style={{
              padding: "0 14px",
              height: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(56, 189, 248, 0.12)",
              borderLeft: "1.5px solid rgba(56, 189, 248, 0.35)",
              color: "#38bdf8",
              fontWeight: 800,
              fontSize: "0.92rem",
              userSelect: "none",
              letterSpacing: "0.01em",
              whiteSpace: "nowrap",
            }}
          >
            @unab.edu.co
          </div>
        </div>

        <button
          className="auth-submit"
          type="submit"
          disabled={isPending}
          style={{
            width: "100%",
            height: "48px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
            color: "#ffffff",
            fontSize: "1rem",
            fontWeight: 800,
            border: "none",
            cursor: isPending ? "wait" : "pointer",
            boxShadow: "0 4px 18px rgba(2, 132, 199, 0.45)",
          }}
        >
          {isPending ? "Ingresando…" : "Ingresar a Universidad OS →"}
        </button>
        {message && (
          <p className="auth-message" role="status" aria-live="polite" style={{ marginTop: "12px", borderRadius: "8px" }}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
