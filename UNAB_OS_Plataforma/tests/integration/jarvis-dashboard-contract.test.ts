import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const shell = source("components/application-shell.tsx");
const command = source("components/jarvis-command.tsx");
const course = source("app/(app)/tema/course/[courseId]/page.tsx");
const progress = source("app/(app)/progress/page.tsx");
const panel = source("components/jarvis-coach-panel.tsx");
const action = source("app/actions/jarvis.ts");
const bridge = source("lib/jarvis/bridge.ts");

describe("Jarvis dashboard integration contract", () => {
  it("queues only authenticated cloud TEMA material owned by the caller", () => {
    expect(action).toMatch(/requireUser\(\)/);
    expect(action).toMatch(/getTemaFileByCandidateId\(candidateId,\s*userId\)/);
    expect(action).toMatch(/queueCloudJarvisHandoff/);
    expect(action).toMatch(/supabase,\s*ownerId:\s*userId/);
  });

  it("keeps private paths server-side while exposing candidate identifiers to the action", () => {
    expect(shell).toMatch(/JarvisCommand/);
    expect(command).toMatch(/resolveJarvisMaterialRequest/);
    expect(command).toMatch(/name="candidateId"/);
    expect(course).toMatch(/name="candidateId"/);
    expect(`${command}\n${course}`).not.toMatch(/document\.path|localRelativePath|TEMA_DATA_ROOT|\/home\//);
    expect(bridge).toMatch(/getCloudJarvisSnapshot/);
  });

  it("labels imported JSON as advisory instead of authoritative mastery", () => {
    expect(panel).toContain("evidencia externa orientativa");
    expect(panel).toContain("No cambia automáticamente tu nivel M0–M4");
    expect(progress).toContain("nunca modifican automáticamente M0–M4");
    expect(`${panel}\n${progress}`).not.toMatch(/from\("mastery"\)|update\([^)]*mastery/);
  });
});
