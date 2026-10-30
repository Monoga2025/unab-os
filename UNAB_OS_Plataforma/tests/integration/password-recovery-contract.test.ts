import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { safeAuthRedirectPath } from "@/lib/supabase/redirect";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("password recovery contract", () => {
  it("only accepts same-site relative callback destinations", () => {
    expect(safeAuthRedirectPath("/reset-password")).toBe("/reset-password");
    expect(safeAuthRedirectPath("/reset-password?from=email")).toBe("/reset-password?from=email");
    expect(safeAuthRedirectPath("https://evil.example", "/reset-password")).toBe("/reset-password");
    expect(safeAuthRedirectPath("//evil.example", "/reset-password")).toBe("/reset-password");
    expect(safeAuthRedirectPath("/\\evil.example", "/reset-password")).toBe("/reset-password");
  });

  it("uses the Supabase PKCE recovery flow without exposing account existence", () => {
    const requestForm = source("app/forgot-password/forgot-password-form.tsx");
    const callback = source("app/auth/callback/route.ts");
    const resetForm = source("app/reset-password/reset-password-form.tsx");

    expect(requestForm).toContain("resetPasswordForEmail");
    expect(requestForm).toContain("Si existe una cuenta con ese correo");
    expect(requestForm).not.toContain("error.message");
    expect(callback).toContain("exchangeCodeForSession");
    expect(callback).toContain("verifyOtp");
    expect(callback).toContain('type === "recovery"');
    expect(callback).toContain("safeAuthRedirectPath");
    expect(resetForm).toContain("updateUser({ password })");
    expect(resetForm).toContain("signOut()");
  });

  it("requires an authenticated recovery session before showing the password form", () => {
    const page = source("app/reset-password/page.tsx");
    expect(page).toContain("supabase.auth.getUser()");
    expect(page).toContain('redirect("/forgot-password?error=invalid-link")');
  });
});
