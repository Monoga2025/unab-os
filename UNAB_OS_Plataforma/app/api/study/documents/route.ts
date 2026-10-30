import { revalidatePath } from "next/cache";
import { documentUploadPolicy, validateStudyDocument, type StudyDocumentKind } from "@/lib/domain/study";
import { validateStudyDocumentBytes } from "@/lib/domain/study-document-bytes";
import { createClient } from "@/lib/supabase/server";

const STUDY_BUCKET = "attempt-work";
const MAX_MULTIPART_OVERHEAD_BYTES = 64 * 1024;
const MAX_REQUEST_BYTES = documentUploadPolicy.maxBytes + MAX_MULTIPART_OVERHEAD_BYTES;

type UploadError = { ok: false; error: string };

function errorResponse(error: string, status: number) {
  return Response.json({ ok: false, error } satisfies UploadError, { status });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return errorResponse("El archivo supera el límite de 10 MB.", 413);
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (userError || !userId) return errorResponse("Tu sesión venció. Volvé a ingresar.", 401);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("No se pudo leer el archivo enviado.", 400);
  }

  const kind = formData.get("kind");
  const file = formData.get("file");
  if ((kind !== "material" && kind !== "rubric") || !(file instanceof File)) {
    return errorResponse("Elegí un archivo y un tipo de documento válidos.", 400);
  }
  if (file.size > documentUploadPolicy.maxBytes) {
    return errorResponse("El archivo supera el límite de 10 MB.", 413);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const byteValidation = validateStudyDocumentBytes({
    fileName: file.name,
    claimedMimeType: file.type,
    bytes,
  });
  if (!byteValidation.valid) {
    return errorResponse("El archivo debe ser un PDF válido o texto UTF-8 sin contenido binario.", 415);
  }

  const metadataValidation = validateStudyDocument({
    kind: kind as StudyDocumentKind,
    fileName: file.name,
    mimeType: byteValidation.mimeType,
    bytes: bytes.byteLength,
  });
  if (!metadataValidation.valid) {
    const status = metadataValidation.reason === "file_too_large" ? 413 : 400;
    return errorResponse("El nombre o tamaño del archivo no es válido.", status);
  }

  const objectName = `${userId}/study-documents/${crypto.randomUUID()}.${byteValidation.extension}`;
  const { error: uploadError } = await supabase.storage.from(STUDY_BUCKET).upload(objectName, bytes, {
    contentType: byteValidation.mimeType,
    upsert: false,
  });
  if (uploadError) return errorResponse("No se pudo subir el archivo.", 502);

  const { data: document, error: insertError } = await supabase
    .from("study_documents")
    .insert({
      user_id: userId,
      kind,
      status: "ready",
      file_name: file.name,
      mime_type: byteValidation.mimeType,
      size_bytes: bytes.byteLength,
      storage_bucket: STUDY_BUCKET,
      storage_object_name: objectName,
    })
    .select("id, kind, status, file_name, mime_type, size_bytes, created_at")
    .single();

  if (insertError || !document) {
    await supabase.storage.from(STUDY_BUCKET).remove([objectName]);
    return errorResponse("No se pudo guardar el documento. El archivo subido fue descartado.", 500);
  }

  revalidatePath("/study");
  revalidatePath("/dashboard");
  return Response.json({
    ok: true,
    message: "Documento agregado a tu espacio de estudio.",
    document,
  });
}
