import { createReadStream } from "node:fs";
import { lstat, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, sep } from "node:path";
import { Readable } from "node:stream";
import { getTemaDownloadsRoot, getTemaFileByCandidateId } from "@/lib/tema/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/auth";

const MAX_FILE_BYTES = 100 * 1024 * 1024;

type RouteContext = {
  params: Promise<{ candidateId: string }>;
};

type ByteRange = Readonly<{ start: number; end: number }>;

function notFound(): Response {
  return new Response("Not found.", { status: 404 });
}

function sanitizeFileName(fileName: string): string {
  const cleaned = fileName
    .replace(/[\u0000-\u001f\u007f"\\/]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 180) || "download";
}

function contentDisposition(fileName: string, inline: boolean): string {
  const safeName = sanitizeFileName(fileName);
  const asciiName = safeName.replace(/[^\x20-\x7e]/g, "_");
  const encodedName = encodeURIComponent(safeName).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${inline ? "inline" : "attachment"}; filename="${asciiName}"; filename*=UTF-8''${encodedName}`;
}

function safeContentType(contentType: string): { contentType: string; inline: boolean } {
  const normalized = contentType.split(";", 1)[0].trim().toLowerCase();
  if (normalized === "application/pdf") return { contentType: normalized, inline: true };
  if (normalized === "text/html" || normalized === "application/xhtml+xml" || normalized === "image/svg+xml") {
    return { contentType: "application/octet-stream", inline: false };
  }
  if (!/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(normalized)) {
    return { contentType: "application/octet-stream", inline: false };
  }
  return { contentType: normalized, inline: false };
}

function parseSingleRange(header: string, size: number): ByteRange | null {
  if (size <= 0 || header.includes(",")) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return null;

  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    return { start: Math.max(0, size - suffixLength), end: size - 1 };
  }

  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;
  if (
    !Number.isSafeInteger(start)
    || !Number.isSafeInteger(requestedEnd)
    || start < 0
    || start >= size
    || requestedEnd < start
  ) return null;
  return { start, end: Math.min(requestedEnd, size - 1) };
}

async function hasSymlinkComponent(root: string, localRelativePath: string): Promise<boolean> {
  const components = localRelativePath.replace(/\\/g, "/").split("/").filter(Boolean);
  let current = root;
  for (const component of components) {
    current = join(current, component);
    if ((await lstat(current)).isSymbolicLink()) return true;
  }
  return false;
}

export async function GET(request: Request, { params }: RouteContext): Promise<Response> {
  const { userId } = await requireUser();
  const { candidateId } = await params;
  const file = await getTemaFileByCandidateId(candidateId, userId);
  if (!file || file.status !== "downloaded") return notFound();

  if (process.env.TEMA_DATA_SOURCE !== "local" && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const { data, error } = await createAdminClient().storage
      .from("tema-private")
      .createSignedUrl(file.localRelativePath, 60);
    if (error || !data?.signedUrl) return notFound();
    return Response.redirect(data.signedUrl, 307);
  }

  try {
    const downloadsRootRealPath = await realpath(getTemaDownloadsRoot());
    if (await hasSymlinkComponent(downloadsRootRealPath, file.localRelativePath)) return notFound();

    const requestedPath = join(downloadsRootRealPath, file.localRelativePath);
    const fileMetadata = await lstat(requestedPath);
    if (fileMetadata.isSymbolicLink() || !fileMetadata.isFile()) return notFound();
    if (fileMetadata.size > MAX_FILE_BYTES || fileMetadata.size !== file.bytes) return notFound();

    const fileRealPath = await realpath(requestedPath);
    const relativePath = relative(downloadsRootRealPath, fileRealPath);
    if (relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) return notFound();

    const { contentType, inline } = safeContentType(file.contentType);
    const headers = new Headers();
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "private, no-store");
    headers.set("Content-Disposition", contentDisposition(file.fileName, inline));
    headers.set("Content-Type", contentType);
    headers.set("X-Content-Type-Options", "nosniff");

    const rangeHeader = request.headers.get("range");
    if (rangeHeader) {
      const range = parseSingleRange(rangeHeader, fileMetadata.size);
      if (!range) {
        headers.set("Content-Range", `bytes */${fileMetadata.size}`);
        return new Response(null, { status: 416, headers });
      }
      headers.set("Content-Length", String(range.end - range.start + 1));
      headers.set("Content-Range", `bytes ${range.start}-${range.end}/${fileMetadata.size}`);
      const stream = createReadStream(fileRealPath, { start: range.start, end: range.end });
      return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { status: 206, headers });
    }

    headers.set("Content-Length", String(fileMetadata.size));
    const stream = createReadStream(fileRealPath);
    return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { status: 200, headers });
  } catch {
    return notFound();
  }
}
