import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFile(resolve(root, path), "utf8");

describe("Railway combined deployment contract", () => {
  it("builds the standalone dashboard and packaged Jarvis without local state", async () => {
    const [dockerfile, nextConfig, dockerignore] = await Promise.all([
      read("Dockerfile"),
      read("next.config.ts"),
      read(".dockerignore"),
    ]);

    expect(nextConfig).toContain('output: "standalone"');
    expect(dockerfile).toContain("/workspace/.next/standalone");
    expect(dockerfile).toContain("deployment/jarvis/src");
    expect(dockerfile).toContain("ARG NEXT_PUBLIC_SUPABASE_URL");
    expect(dockerfile).not.toMatch(/ARG (?:TELEGRAM|NVIDIA|OPENAI)_[A-Z0-9_]+/);
    expect(dockerfile).not.toMatch(/COPY\s+.*\.env/i);
    expect(dockerignore).toMatch(/^\.env$/m);
    expect(dockerignore).toMatch(/^deployment\/jarvis\/data$/m);
  });

  it("uses one shared persistent root and coordinated process supervision", async () => {
    const [dockerfile, entrypoint, railway] = await Promise.all([
      read("Dockerfile"),
      read("deployment/railway/entrypoint.sh"),
      read("railway.json").then((value) => JSON.parse(value) as Record<string, unknown>),
    ]);
    const deploy = railway.deploy as Record<string, unknown>;

    expect(dockerfile).toContain("TEMA_DATA_ROOT=/data/tema");
    expect(dockerfile).toContain("JARVIS_BRIDGE_PATH=/data/university-os-bridge");
    expect(dockerfile).toContain("UNAB_OS_BRIDGE_PATH=/data/university-os-bridge");
    expect(entrypoint).toContain('node /app/server.js');
    expect(entrypoint).toContain('/opt/jarvis-venv/bin/jarvis-telegram');
    expect(entrypoint).toContain('wait -n "${next_pid}" "${jarvis_pid}"');
    expect(deploy.healthcheckPath).toBe("/api/health");
    expect(deploy.restartPolicyType).toBe("ON_FAILURE");
  });

  it("configures the academic collaboration feature flag and deployment runbook safely", async () => {
    const [envExample, railwayDocs, railway] = await Promise.all([
      read(".env.example"),
      read("docs/railway-deployment.md"),
      read("railway.json").then((value) => JSON.parse(value) as Record<string, unknown>),
    ]);

    expect(envExample).toContain("ACADEMIC_COLLABORATION_ENABLED=false");
    expect(envExample).toContain("ACADEMIC_CURRENT_TERM_KEY=2026-2");
    expect(railwayDocs).toContain("ACADEMIC_COLLABORATION_ENABLED=true");
    expect(railwayDocs).toContain("https://<railway-domain>/auth/callback");
    expect(railwayDocs).toContain("supabase db push");
    expect(railwayDocs).toContain("NEXT_PUBLIC_ENABLE_TEST_ACCESS=false");
    expect(railwayDocs).not.toMatch(/SUPABASE_(?:SERVICE_ROLE|SECRET)_KEY\s*=\s*\S+/);
    const deploy = railway.deploy as Record<string, unknown>;
    expect(deploy.healthcheckPath).toBe("/api/health");
  });
});
