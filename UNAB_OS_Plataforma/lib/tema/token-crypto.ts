import "server-only";

import { createCipheriv, createHash, randomBytes } from "node:crypto";

const AAD = Buffer.from("universidad-os:tema-token:v1", "utf8");

function base64url(value: Buffer): string {
  return value.toString("base64url");
}

export function encryptTemaToken(token: string, keyText: string): string {
  if (!/^[A-Za-z0-9]{16,256}$/.test(token)) throw new Error("TEMA returned an invalid token.");
  if (keyText.length < 32) throw new Error("TEMA_CREDENTIALS_KEY must contain at least 32 characters.");
  const key = createHash("sha256").update(keyText, "utf8").digest();
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(AAD);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return ["v1", base64url(nonce), base64url(ciphertext), base64url(cipher.getAuthTag())].join(".");
}

export function fingerprintTemaToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
