#!/usr/bin/env node
import { chmod, readFile, rename, writeFile } from "node:fs/promises";

const target = process.argv[2];
const keys = ["UNAB_OS_API_URL", "UNAB_OS_BRIDGE_TOKEN", "UNAB_OS_OWNER_ID"];
if (!target) throw new Error("Usage: configure-jarvis-cloud-env.mjs /absolute/path/to/.env");

const replacements = new Map(keys.map((key) => {
  const value = process.env[key]?.trim();
  if (!value || /[\r\n]/.test(value)) throw new Error(`Missing or invalid ${key}.`);
  return [key, value];
}));

const existing = await readFile(target, "utf8");
const kept = existing.split(/\r?\n/).filter((line) => {
  const key = line.match(/^([A-Z][A-Z0-9_]*)=/)?.[1];
  return !key || !replacements.has(key);
});
while (kept.at(-1) === "") kept.pop();
for (const [key, value] of replacements) kept.push(`${key}=${value}`);

const temporary = `${target}.cloud-env.tmp`;
await writeFile(temporary, `${kept.join("\n")}\n`, { mode: 0o600 });
await chmod(temporary, 0o600);
await rename(temporary, target);
process.stdout.write(`${keys.join(",")} configured\n`);
