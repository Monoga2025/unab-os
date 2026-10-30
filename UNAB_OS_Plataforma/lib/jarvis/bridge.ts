import "server-only";

import { randomUUID } from "node:crypto";
import { copyFile, lstat, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import {
  buildJarvisStudyPrompt,
  jarvisHandoffSchema,
  parseJarvisStudyHandoff,
  parseJarvisStudyReportEnvelope,
  type JarvisStudyHandoff,
  type JarvisStudyReportEnvelope,
} from "@/lib/domain/jarvis";

const MAX_BRIDGE_FILE_BYTES = 64 * 1024;
const MAX_RECENT_ITEMS = 12;

export type JarvisBridgeStatus = "queued" | "delivered" | "reviewed";

export type JarvisBridgeHandoffView = Readonly<{
  handoff: JarvisStudyHandoff;
  status: JarvisBridgeStatus;
}>;

export type JarvisBridgeSnapshot = Readonly<{
  handoffs: readonly JarvisBridgeHandoffView[];
  reports: readonly JarvisStudyReportEnvelope[];
}>;

type QueueInput = Readonly<{
  ownerId: string;
  title: string;
  subject: string;
  topic: string;
  document: JarvisStudyHandoff["document"];
}>;

function bridgeRoot(): string {
  const configured = process.env.JARVIS_BRIDGE_PATH?.trim();
  if (configured?.includes("\0")) throw new Error("Invalid Jarvis bridge path.");
  if (configured) return isAbsolute(configured) ? configured : resolve(/*turbopackIgnore: true*/ process.cwd(), configured);
  return join(homedir(), "Escritorio", "Estudio UNAB", "jarvis-telegram", "data", "university-os-bridge");
}

function directory(name: "outbox" | "delivered" | "reports" | "documents"): string {
  return join(bridgeRoot(), name);
}

async function ensureBridgeDirectories(): Promise<void> {
  await Promise.all([
    mkdir(directory("outbox"), { recursive: true, mode: 0o700 }),
    mkdir(directory("delivered"), { recursive: true, mode: 0o700 }),
    mkdir(directory("reports"), { recursive: true, mode: 0o700 }),
    mkdir(directory("documents"), { recursive: true, mode: 0o700 }),
  ]);
}

async function atomicJsonWrite(path: string, value: unknown): Promise<void> {
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
  await rename(temporaryPath, path);
}

async function readBoundedJson(path: string): Promise<unknown | null> {
  try {
    const metadata = await lstat(path);
    if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > MAX_BRIDGE_FILE_BYTES) return null;
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch {
    return null;
  }
}

async function readByIds<T>(folder: "outbox" | "delivered" | "reports", ids: readonly string[], parser: (value: unknown) => T | null): Promise<T[]> {
  const values = await Promise.all(
    ids.map(async (id) => parser(await readBoundedJson(join(directory(folder), `${id}.json`)))),
  ) as (T | null)[];
  const parsed: T[] = [];
  for (const value of values) if (value !== null) parsed.push(value);
  return parsed;
}

async function existingIds(folder: "outbox" | "delivered" | "reports"): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  try {
    const entries = await readdir(directory(folder), { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && !entry.isSymbolicLink() && /^[0-9a-f-]{36}\.json$/i.test(entry.name))
      .map((entry) => entry.name.slice(0, -5));
  } catch {
    return [];
  }
}

export async function queueJarvisStudyHandoff(input: QueueInput): Promise<JarvisStudyHandoff> {
  await ensureBridgeDirectories();
  const id = randomUUID();
  if (input.document.fileName.includes("/") || input.document.fileName.includes("\\") || input.document.fileName === "." || input.document.fileName === "..") {
    throw new Error("Invalid Jarvis document name.");
  }
  const handoffDocumentDirectory = join(directory("documents"), id);
  await mkdir(handoffDocumentDirectory, { recursive: false, mode: 0o700 });
  const stagedDocumentPath = join(handoffDocumentDirectory, input.document.fileName);
  const temporaryDocumentPath = `${stagedDocumentPath}.${randomUUID()}.tmp`;
  try {
    await copyFile(input.document.path, temporaryDocumentPath);
    await rename(temporaryDocumentPath, stagedDocumentPath);
  } catch (error) {
    await unlink(temporaryDocumentPath).catch(() => undefined);
    throw error;
  }
  const handoff: JarvisStudyHandoff = {
    schemaVersion: jarvisHandoffSchema,
    id,
    ownerId: input.ownerId,
    title: input.title.trim(),
    subject: input.subject.trim(),
    topic: input.topic.trim(),
    prompt: buildJarvisStudyPrompt({ handoffId: id, subject: input.subject.trim(), topic: input.topic.trim() }),
    document: { ...input.document, path: stagedDocumentPath },
    createdAt: new Date().toISOString(),
  };
  if (!parseJarvisStudyHandoff(handoff)) throw new Error("Invalid Jarvis study handoff.");
  await atomicJsonWrite(join(directory("outbox"), `${id}.json`), handoff);
  return handoff;
}

export async function getJarvisBridgeSnapshot(ownerId: string): Promise<JarvisBridgeSnapshot> {
  if (!ownerId || ownerId === "00000000-0000-0000-0000-000000000000") {
    return { handoffs: [], reports: [] };
  }

  if (process.env.JARVIS_BRIDGE_MODE !== "local" && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const [{ createAdminClient }, { getCloudJarvisSnapshot }] = await Promise.all([
      import("@/lib/supabase/admin"),
      import("./cloud"),
    ]);
    return getCloudJarvisSnapshot(createAdminClient(), ownerId);
  }
  const [queuedIds, deliveredIds, reportIds] = await Promise.all([
    existingIds("outbox"),
    existingIds("delivered"),
    existingIds("reports"),
  ]);
  const [queued, delivered, reports] = await Promise.all([
    readByIds("outbox", queuedIds, parseJarvisStudyHandoff),
    readByIds("delivered", deliveredIds, parseJarvisStudyHandoff),
    readByIds("reports", reportIds, parseJarvisStudyReportEnvelope),
  ]);
  const ownerReports = reports.filter((envelope) => envelope.ownerId === ownerId);
  const reportIdsForOwner = new Set(ownerReports.map((envelope) => envelope.report.handoffId));
  const handoffs: JarvisBridgeHandoffView[] = [
    ...queued.filter((handoff) => handoff.ownerId === ownerId).map((handoff) => ({ handoff, status: "queued" as const })),
    ...delivered.filter((handoff) => handoff.ownerId === ownerId).map((handoff) => ({
      handoff,
      status: reportIdsForOwner.has(handoff.id) ? "reviewed" as const : "delivered" as const,
    })),
  ];
  return {
    handoffs: handoffs.sort((a, b) => b.handoff.createdAt.localeCompare(a.handoff.createdAt)).slice(0, MAX_RECENT_ITEMS),
    reports: ownerReports.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)).slice(0, MAX_RECENT_ITEMS),
  };
}
