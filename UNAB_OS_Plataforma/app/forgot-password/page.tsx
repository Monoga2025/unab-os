import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;

  return (
    <main className="auth-page auth-page-compact">
      <section className="auth-form-panel" aria-labelledby="recovery-title">
        <div className="auth-form-wrap">
          <p className="auth-kicker">Recuperar acceso</p>
          <h1 id="recovery-title" className="auth-form-title">Crea una nueva contraseña</h1>
          <p className="auth-helper">Te enviaremos un enlace seguro al correo asociado con tu cuenta.</p>
          {params.error === "invalid-link" && (
            <p className="auth-message" role="alert">El enlace es inválido o ya expiró. Solicitá uno nuevo.</p>
          )}
          <ForgotPasswordForm />
        </div>
      </section>
    </main>
  );
}
