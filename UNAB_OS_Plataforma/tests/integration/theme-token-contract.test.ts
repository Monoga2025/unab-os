import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const styles = source("app/styles.css");
const tokens = source("app/design-tokens.css");
const normalizedStyles = styles.replace(/\r\n/g, "\n");
const activeTheme = normalizedStyles.slice(normalizedStyles.lastIndexOf("/*\n * Active platform theme."));
const studyTutorProgressTheme = normalizedStyles.slice(normalizedStyles.lastIndexOf("/* Active light-token migration: Estudio, Tutor IA y Progreso. */"));

describe("global theme token contract", () => {
  it("loads a primitive → semantic → component token layer", () => {
    expect(styles).toContain('@import "./design-tokens.css"');
    expect(tokens).toContain("--primitive-lavender-600");
    expect(tokens).toContain("--color-primary: var(--primitive-lavender-600)");
    expect(tokens).toContain("--button-primary-bg: var(--color-primary)");
  });

  it("keeps the active platform layer free of legacy blue values", () => {
    expect(activeTheme).not.toMatch(/#(?:2563eb|3b82f6|60a5fa)/i);
    expect(activeTheme).toContain("var(--color-primary)");
    expect(activeTheme).toContain("var(--color-bg-surface)");
  });

  it("defines readable light surfaces and inverse sidebar text", () => {
    expect(tokens).toContain("--color-bg-surface: var(--primitive-white)");
    expect(tokens).toContain("--color-text: var(--primitive-slate-950)");
    expect(tokens).toContain("--color-bg-inverse: var(--primitive-lavender-900)");
    expect(activeTheme).toContain(".app-sidebar{background:var(--color-bg-inverse)");
  });

  it("keeps the login panel and its headings on the same light semantic theme", () => {
    expect(activeTheme).toContain(".auth-brand-panel{background:radial-gradient");
    expect(activeTheme).toContain("var(--color-primary-subtle)");
    expect(activeTheme).toContain(".auth-brand,.auth-brand-copy h1,.auth-brand strong,.auth-form-wrap h2{color:var(--color-text)}");
    expect(activeTheme).toContain(".auth-form-wrap{background:var(--color-bg-surface)");
  });

  it("keeps study, tutor, and progress controls in the light token contract", () => {
    expect(tokens).toContain("--study-plan-bg: var(--color-bg-subtle)");
    expect(tokens).toContain("--tutor-context-bg: var(--color-bg-subtle)");
    expect(tokens).toContain("--progress-control-bg: var(--color-bg-subtle)");
    expect(studyTutorProgressTheme).toContain(".study-form input,.study-form select{background:var(--study-plan-bg)");
    expect(studyTutorProgressTheme).toContain(".tutor-context-form select,.tutor-attempt-select select");
    expect(studyTutorProgressTheme).toContain(".progress-filters select{background:var(--progress-control-bg)");
    expect(studyTutorProgressTheme).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});
