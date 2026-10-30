import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(resolve(process.cwd(), "app/(app)/tutor/page.tsx"), "utf8");
const workspace = readFileSync(resolve(process.cwd(), "components/tutor-workspace.tsx"), "utf8");
const styles = readFileSync(resolve(process.cwd(), "app/styles.css"), "utf8");

describe("tutor UI safety contract", () => {
  it("loads only the authenticated learner's recent independent attempts with minimal fields", () => {
    expect(page).toMatch(/\.from\(\s*["']attempts["']\s*\)\s*\.select\(\s*["']id, objective_id, created_at["']\s*\)/);
    expect(page).toMatch(/\.eq\(\s*["']user_id["']\s*,\s*userId\s*\)/);
    expect(page).toMatch(/\.eq\(\s*["']help_level["']\s*,\s*["']none["']\s*\)/);
    expect(page).toMatch(/\.order\(\s*["']created_at["']\s*,\s*\{\s*ascending:\s*false\s*\}\s*\)/);
    expect(page).toMatch(/attempts=\{/);
  });

  it("offers an explicit accessible concept or exercise mode control", () => {
    expect(workspace).toMatch(/<fieldset[^>]*className="tutor-mode-control"/);
    expect(workspace).toMatch(/<legend>Modo de tutoría<\/legend>/);
    expect(workspace).toMatch(/type="radio"[\s\S]*?value="concept"/);
    expect(workspace).toMatch(/type="radio"[\s\S]*?value="exercise"/);
    expect(workspace).toMatch(/Intento independiente/);
  });

  it("sends an attempt ID only for exercise review and resets it with the objective", () => {
    expect(workspace).toMatch(/mode,\s*objectiveId/);
    expect(workspace).toMatch(/mode\s*===\s*["']exercise["'][\s\S]*?attemptId/);
    expect(workspace).toMatch(/setAttemptId\(["']{2}\)/);
    expect(workspace).toMatch(/attempt\.objectiveId\s*===\s*objectiveId/);
    expect(workspace).not.toMatch(/mode:\s*["']concept["']/);
  });

  it("uses the compatible flex-end alignment value", () => {
    expect(styles).not.toContain("align-items:end");
    expect(styles).toContain("align-items:flex-end");
  });
});
