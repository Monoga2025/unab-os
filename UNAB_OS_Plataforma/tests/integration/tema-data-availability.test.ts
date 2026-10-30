import { beforeEach, describe, expect, it, vi } from "vitest";

const fileSystem = vi.hoisted(() => ({
  readFile: vi.fn(),
  stat: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("node:fs/promises", () => fileSystem);

import { loadTemaData } from "@/lib/tema/data";

describe("TEMA data availability", () => {
  beforeEach(() => {
    fileSystem.readFile.mockReset();
    fileSystem.stat.mockReset();
  });

  it("returns deeply immutable empty collections when the private capture is absent", async () => {
    fileSystem.stat.mockRejectedValue(Object.assign(new Error("missing"), { code: "ENOENT" }));

    const data = await loadTemaData();

    expect(data).toEqual({ courses: [], sections: [], activities: [], files: [], grades: [], announcements: [] });
    expect(Object.isFrozen(data)).toBe(true);
    expect(Object.values(data).every(Object.isFrozen)).toBe(true);
  });

  it("does not hide filesystem failures other than a missing capture", async () => {
    const denied = Object.assign(new Error("permission denied"), { code: "EACCES" });
    fileSystem.stat.mockRejectedValue(denied);

    await expect(loadTemaData()).rejects.toBe(denied);
  });
});
