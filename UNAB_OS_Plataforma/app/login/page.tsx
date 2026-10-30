import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "./auth-form";
import { getInstitutionalUser } from "@/lib/supabase/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; auth?: string }>;
}) {
  const { error, auth } = await searchParams;

  // If already authenticated and not explicitly signing out, redirect to dashboard
  if (auth !== "logout") {
    const user = await getInstitutionalUser();
    if (user) {
      redirect("/dashboard");
    }
  }

  const initialMessage =
    error === "institutional-email-required"
      ? "Usá tu correo institucional @unab.edu.co."
      : null;

  return (
    <div
      className="login-screen-luxury-container"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at 50% 0%, rgba(14, 165, 233, 0.08) 0%, #090d16 100%)",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#0d1322",
          border: "1px solid rgba(56, 189, 248, 0.2)",
          borderRadius: "20px",
          padding: "36px 32px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(14, 165, 233, 0.1)",
          color: "#ffffff",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              marginBottom: "16px",
              boxShadow: "0 8px 20px rgba(2, 132, 199, 0.3)",
            }}
          >
            🎓
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>
            Universidad OS · UniNova
          </h1>
          <p style={{ fontSize: "0.88rem", color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>
            Portal Académico Institucional de Ingeniería Mecatrónica (UNAB)
          </p>
        </div>

        <AuthForm initialMessage={initialMessage} />

        <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", textAlign: "center" }}>
          <Link
            href="/dashboard"
            style={{ fontSize: "0.82rem", color: "#38bdf8", textDecoration: "none", fontWeight: 500 }}
          >
            ← Explorar en modo invitado
          </Link>
        </div>
      </div>
    </div>
  );
}

