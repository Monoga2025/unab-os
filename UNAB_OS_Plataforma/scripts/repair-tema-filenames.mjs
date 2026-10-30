#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { cleanDisplayFileName } from "./lib/tema-filenames.mjs";

const root = process.env.TEMA_DATA_ROOT || join(homedir(), ".local", "share", "unab-os", "tema");
const ownerId = process.env.UNAB_OS_OWNER_ID;
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!ownerId || !url || !secretKey) throw new Error("Missing scoped Supabase repair configuration.");

const manifest = JSON.parse(await readFile(join(root, "download-manifest.json"), "utf8"));
if (manifest.private !== true || !Array.isArray(manifest.files)) throw new Error("Invalid private TEMA manifest.");

const desired = new Map(manifest.files
  .filter((file) => file.status === "downloaded")
  .map((file) => {
    const sourceName = String(file.local_relative_path).replaceAll("\\", "/").split("/").at(-1);
    return [String(file.candidate_id), cleanDisplayFileName(sourceName)];
  }));

const supabase = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: current, error: readError } = await supabase
  .from("tema_files")
  .select("candidate_id,file_name")
  .eq("owner_id", ownerId);
if (readError) throw readError;

let updated = 0;
for (const row of current) {
  const fileName = desired.get(row.candidate_id);
  if (!fileName || fileName === row.file_name) continue;
  const { error } = await supabase
    .from("tema_files")
    .update({ file_name: fileName, updated_at: new Date().toISOString() })
    .eq("owner_id", ownerId)
    .eq("candidate_id", row.candidate_id);
  if (error) throw new Error(`Could not repair ${row.candidate_id}: ${error.message}`);
  updated += 1;
}

const { data: verified, error: verifyError } = await supabase
  .from("tema_files")
  .select("candidate_id,file_name")
  .eq("owner_id", ownerId);
if (verifyError) throw verifyError;
const damaged = verified.filter((row) => /Ã3|Ã.|Â|\uFFFD/.test(row.file_name));
if (damaged.length) throw new Error(`Filename repair left ${damaged.length} damaged rows.`);

process.stdout.write(JSON.stringify({ checked: current.length, updated, damaged: damaged.length }) + "\n");
