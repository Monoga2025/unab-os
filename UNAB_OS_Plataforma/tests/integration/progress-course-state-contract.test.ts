import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const page = source("app/(app)/progress/page.tsx");
const styles = source("app/styles.css");

describe("progress course-state UX contract", () => {
  it("keeps current courses separate from prior and ambiguous catalog entries", () => {
    expect(page).toContain('catalogCurrent ? "Materias activas" : "Materias de la última captura"');
    expect(page).toContain("Actividad anterior");
    expect(page).toContain('<details className="progress-archive"');
    expect(page).toContain('name="history"');
    expect(page).toContain("previousProgress");
    expect(page).toContain("archivedProgress");
    expect(page).not.toContain("visibleCourses");
  });

  it("does not present a disconnected or stale capture as current truth", () => {
    expect(page).toContain('from("tema_connections")');
    expect(page).toContain('from("tema_sync_runs")');
    expect(page).toMatch(/latestSync\?\.status === "complete"/);
    expect(page).toContain("FRESH_CAPTURE_MS");
    expect(page).toContain("TEMA no está conectado");
    expect(page).toContain("Datos desactualizados");
    expect(page).toContain("Referencia, no estado actual");
  });

  it("preserves advisory Jarvis evidence and the evaluated M0–M4 boundary", () => {
    expect(page).toContain("Fortalezas");
    expect(page).toContain("Por reforzar");
    expect(page).toContain("Próxima acción");
    expect(page).toContain("nunca modifican automáticamente M0–M4");
    expect(page).not.toMatch(/from\("mastery"\)|update\([^)]*mastery/);
  });

  it("keeps the archive keyboard-visible and responsive", () => {
    expect(styles).toContain(".progress-archive>summary:focus-visible");
    expect(styles).toContain(".progress-archive-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))");
    expect(styles).toMatch(/@media\(max-width:768px\)\{\.progress-archive-list\{grid-template-columns:1fr\}\}/);
    expect(styles).toMatch(/@media\(max-width:480px\).*\.progress-source-state\{grid-template-columns:1fr\}/);
  });
});
