import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) redirect("/forgot-password?error=invalid-link");

  return (
    <main className="auth-page auth-page-compact">
      <section className="auth-form-panel" aria-labelledby="reset-title">
        <div className="auth-form-wrap">
          <p className="auth-kicker">Último paso</p>
          <h1 id="reset-title" className="auth-form-title">Elige tu nueva contraseña</h1>
          <p className="auth-helper">Usá al menos 8 caracteres y guardala en un lugar seguro.</p>
          <ResetPasswordForm />
        </div>
      </section>
    </main>
  );
}
