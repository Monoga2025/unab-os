import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const route = readFileSync(resolve(process.cwd(), "app/api/tema/files/[candidateId]/route.ts"), "utf8");
const data = readFileSync(resolve(process.cwd(), "lib/tema/data.ts"), "utf8");

describe("TEMA private file route contract", () => {
  it("authenticates and accepts only the candidateId route parameter", () => {
    expect(route).toMatch(/requireUser\(\)/);
    expect(route).toMatch(/params:\s*Promise<\{\s*candidateId:\s*string\s*\}>/);
    expect(route).not.toMatch(/searchParams|request\.json|request\.formData|new URL\s*\(/);
    expect(route).toMatch(/getTemaFileByCandidateId\(candidateId,\s*userId\)/);
    expect(route).toMatch(/createAdminClient\(\)\.storage/);
    expect(route).toMatch(/createSignedUrl\(file\.localRelativePath,\s*60\)/);
  });

  it("confines known downloaded files to the real private downloads root", () => {
    expect(route).toMatch(/realpath/);
    expect(route).toMatch(/lstat/);
    expect(route).toMatch(/isSymbolicLink\(\)/);
    expect(route).toMatch(/isFile\(\)/);
    expect(route).toMatch(/100\s*\*\s*1024\s*\*\s*1024/);
    expect(route).toMatch(/relative\(downloadsRootRealPath,\s*fileRealPath\)/);
    expect(route).toMatch(/relativePath\.startsWith\(`\.\.\$\{sep\}`\)/);
    expect(route).not.toMatch(/source\.(?:fetch|final|display)_url/);
  });

  it("streams known bytes with defensive headers and single-range behavior", () => {
    expect(route).toMatch(/createReadStream/);
    expect(route).toMatch(/Readable\.toWeb/);
    expect(route).toMatch(/Content-Disposition/);
    expect(route).toMatch(/filename\*=UTF-8''/);
    expect(route).toMatch(/Cache-Control["']?,\s*["']private, no-store/);
    expect(route).toMatch(/X-Content-Type-Options["']?,\s*["']nosniff/);
    expect(route).toMatch(/Accept-Ranges["']?,\s*["']bytes/);
    expect(route).toMatch(/Content-Range/);
    expect(route).toMatch(/status:\s*206/);
    expect(route).toMatch(/status:\s*416/);
  });

  it("keeps inventory and manifest handling server-only and strips source URLs", () => {
    expect(data).toMatch(/^import ["']server-only["'];/);
    expect(data).toMatch(/TEMA_DATA_ROOT/);
    expect(data).toMatch(/\.local["'],\s*["']share["'],\s*["']unab-os["'],\s*["']tema["']/);
    expect(data).toMatch(/mtimeMs/);
    expect(data).toMatch(/MAX_(?:COURSES|SECTIONS|ACTIVITIES|FILES)/);
    expect(data).not.toMatch(/export type[^;]*(?:fetchUrl|finalUrl|sourceUrl)/);
  });

  it("does not leak filesystem paths or source sessions through error responses", () => {
    expect(route).not.toMatch(/error\.message|Response\.json\([^)]*(?:fileRealPath|downloadsRootRealPath)/);
    expect(route).toMatch(/new Response\(["']Not found\.["'],\s*\{\s*status:\s*404\s*\}\)/);
  });
});
