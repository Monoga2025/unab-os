import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260817202349_add_tutor_persistence.sql"),
  "utf8",
);
const route = readFileSync(resolve(process.cwd(), "app/api/tutor/route.ts"), "utf8");

describe("atomic tutor persistence contract", () => {
  it("exposes one authenticated SECURITY INVOKER RPC with an empty search path and database-derived identity", () => {
    expect(migration).toMatch(/create\s+(?:or\s+replace\s+)?function\s+public\.persist_tutor_exchange\s*\(/i);
    expect(migration).toMatch(/security\s+invoker/i);
    expect(migration).not.toMatch(/security\s+definer/i);
    expect(migration).toMatch(/set\s+search_path\s*=\s*''/i);
    expect(migration).toMatch(/:=\s*\(select\s+auth\.uid\(\)\s*\)/i);
    expect(migration).toMatch(/revoke\s+execute\s+on\s+function\s+public\.persist_tutor_exchange[\s\S]*?from\s+public\s*,\s*anon/i);
    expect(migration).toMatch(/grant\s+execute\s+on\s+function\s+public\.persist_tutor_exchange[\s\S]*?to\s+authenticated/i);
  });

  it("locks the owner conversation before allocating positions and persists the exchange in the function", () => {
    expect(migration).toMatch(/from\s+public\.tutor_conversations[\s\S]*?for\s+update/i);
    expect(migration).toMatch(/max\s*\(\s*[^)]*position[^)]*\)/i);
    expect(migration).toMatch(/insert\s+into\s+public\.tutor_messages/i);
    expect(migration).toMatch(/update\s+public\.tutor_conversations[\s\S]*?updated_at/i);
  });

  it("routes one completed tutor result through the RPC without direct tutor inserts", () => {
    const rpcCalls = route.match(/\.rpc\(\s*["']persist_tutor_exchange["']/g) ?? [];
    expect(rpcCalls).toHaveLength(1);
    expect(route).toMatch(/conversationId\s*\?\?\s*crypto\.randomUUID\(\)/);
    expect(route).not.toMatch(/\.from\(\s*["']tutor_conversations["']\s*\)\s*\.insert\s*\(/);
    expect(route).not.toMatch(/\.from\(\s*["']tutor_conversations["']\s*\)\s*\.update\s*\(/);
    expect(route).not.toMatch(/\.from\(\s*["']tutor_messages["']\s*\)\s*\.insert\s*\(/);

    const boundaryIndex = Math.max(route.indexOf("safeTutorResponse("), route.indexOf("runCodexTutor("));
    const rpcIndex = route.indexOf('.rpc("persist_tutor_exchange"');
    expect(boundaryIndex).toBeGreaterThan(-1);
    expect(rpcIndex).toBeGreaterThan(boundaryIndex);
  });
});
