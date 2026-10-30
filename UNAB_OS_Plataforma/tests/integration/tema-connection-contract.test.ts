import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("private TEMA account connection", () => {
  const route = source("app/api/tema/connect/route.ts");
  const crypto = source("lib/tema/token-crypto.ts");

  it("exchanges credentials only with the official token endpoint and never persists the password", () => {
    expect(route).toContain("https://tema.unab.edu.co/login/token.php");
    expect(route).toContain('service: "moodle_mobile_app"');
    expect(route).toContain("token_envelope");
    expect(route).toMatch(/sync_requested_at:\s*new Date\(\)\.toISOString\(\)/);
    const persistedEnvelope = route.slice(route.indexOf('from("tema_connections")'));
    expect(persistedEnvelope).not.toMatch(/password\s*:/i);
  });

  it("encrypts tokens with authenticated AES-GCM and binds the Python/Node envelope contract", () => {
    expect(crypto).toContain('createCipheriv("aes-256-gcm"');
    expect(crypto).toContain("cipher.setAAD(AAD)");
    expect(crypto).toContain('"universidad-os:tema-token:v1"');
    expect(source("scripts/sync_tema_cloud.py")).toContain('b"universidad-os:tema-token:v1"');
  });
});
