import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { config as proxyConfig } from "@/proxy";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("private session and onboarding controls", () => {
  it("refreshes Supabase cookies on every private page and user-authenticated API", () => {
    expect(existsSync(resolve(process.cwd(), "middleware.ts"))).toBe(false);
    expect(new Set(proxyConfig.matcher)).toEqual(new Set([
      "/dashboard/:path*",
      "/tema/:path*",
      "/study/:path*",
      "/tutor/:path*",
      "/progress/:path*",
      "/course/:path*",
      "/objective/:path*",
      "/materias/:path*",
      "/section/:path*",
      "/evaluaciones/:path*",
      "/api/tutor/:path*",
      "/api/uploads/:path*",
      "/api/study/:path*",
      "/api/tema/:path*",
      "/api/telegram/:path*",
    ]));
    expect(proxyConfig.matcher).not.toContain("/api/jarvis/bridge/:path*");
  });

  it("offers an explicit local-device sign out without terminating other devices", () => {
    const shell = source("components/application-shell.tsx");
    const button = source("components/sign-out-button.tsx");
    expect(shell).toContain("<SignOutButton />");
    expect(button).toContain('signOut({ scope: "local" })');
    expect(button).toContain('window.location.replace("/login")');
    expect(button).toContain("Cerrar sesión");
  });

  it("disconnects only the authenticated owner's encrypted TEMA connection", () => {
    const route = source("app/api/tema/disconnect/route.ts");
    const control = source("components/tema-disconnect-button.tsx");
    const page = source("app/(app)/tema/page.tsx");

    expect(route).toContain("export async function DELETE");
    expect(route.includes("supabase.auth.getUser()") || route.includes("supabase.auth.getClaims()")).toBe(true);
    expect(route).toContain('.from("tema_connections")');
    expect(route).toContain('.delete()');
    expect(route).toContain('.eq("owner_id", ownerId)');
    expect(route).not.toContain("request.json");
    expect(route).not.toMatch(/from\("tema_(?:courses|sections|activities|files)"\)/);
    expect(control).toContain('state === "confirming"');
    expect(control).toContain('method: "DELETE"');
    expect(control).toContain("router.refresh()");
    expect(page).toContain("<TemaDisconnectButton connected=");
  });

  it("lets a study session reopen its private TEMA resource and reports the persisted handoff status", () => {
    const page = source("app/(app)/study/page.tsx");
    const workspace = source("components/study-workspace.tsx");

    expect(page).toContain('select("id,candidate_id,file_name")');
    expect(page).toContain('.eq("owner_id", userId)');
    expect(page).toContain('select("study_session_id,status,created_at")');
    expect(page).toContain("handoffStatusBySession");
    expect(workspace).toContain("Abrir recurso");
    expect(workspace).toContain("Entregado en Telegram");
    expect(workspace).toContain("No se pudo entregar en Telegram");
    expect(workspace).toMatch(/href=\{resource\.href\}[^>]*target="_blank"[^>]*rel="noreferrer"/);
  });
});
