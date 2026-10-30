import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("production UI consistency", () => {
  it("refreshes study data after a successful upload", () => {
    const workspace = source("components/study-workspace.tsx");
    const success = workspace.indexOf("Documento agregado a tu espacio de estudio.");
    const refresh = workspace.indexOf("router.refresh()", success);

    expect(success).toBeGreaterThan(-1);
    expect(refresh).toBeGreaterThan(success);
  });

  it("renders user-visible timestamps in Bogotá on the server and client", () => {
    for (const path of [
      "components/study-workspace.tsx",
      "components/tutor-workspace.tsx",
      "app/(app)/progress/page.tsx",
    ]) {
      expect(source(path)).toMatch(/timeZone:\s*["']America\/Bogota["']/);
    }
  });

  it("does not claim the cloud tutor is a local Codex process", () => {
    expect(source("components/tutor-workspace.tsx")).not.toMatch(/Codex local/);
  });

  it("collapses the study workspace before the tablet sidebar squeezes it", () => {
    const styles = source("app/styles.css");
    const tabletStart = styles.indexOf("@media(max-width:900px){.study-main");
    const mobileStart = styles.indexOf("@media(max-width:720px){.study-main", tabletStart);

    expect(tabletStart).toBeGreaterThan(-1);
    expect(mobileStart).toBeGreaterThan(tabletStart);
    expect(styles.slice(tabletStart, mobileStart)).toContain(".study-layout{grid-template-columns:1fr}");
    expect(styles).toContain(".study-column{min-width:0;");
    expect(styles).toContain(".study-card{min-width:0;");
  });
});
