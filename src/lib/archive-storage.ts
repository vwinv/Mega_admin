import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ARCHIVES_ROOT = path.join(process.cwd(), "data", "archives");
const MAX_BYTES = 15 * 1024 * 1024;

const ALLOWED_EXT = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".xlsx",
  ".xls",
  ".doc",
  ".docx",
]);

const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function resolveArchivePath(cheminStockage: string): string {
  const resolved = path.resolve(ARCHIVES_ROOT, cheminStockage);
  if (!resolved.startsWith(path.resolve(ARCHIVES_ROOT))) {
    throw new Error("Chemin de fichier invalide.");
  }
  return resolved;
}

export async function saveArchiveFile(
  file: File,
  subdir: string
): Promise<{ cheminStockage: string; mimeType: string; tailleOctets: number }> {
  if (file.size <= 0) throw new Error("Fichier vide.");
  if (file.size > MAX_BYTES) {
    throw new Error("Fichier trop volumineux (maximum 15 Mo).");
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error(
      "Format non autorisé. Formats acceptés : PDF, images, Word, Excel."
    );
  }

  const safeName = `${randomUUID()}${ext}`;
  const relativeDir = subdir.replace(/\\/g, "/").replace(/^\/+/, "");
  const dir = path.join(ARCHIVES_ROOT, relativeDir);
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const fullPath = path.join(dir, safeName);
  await writeFile(fullPath, buffer);

  return {
    cheminStockage: path.join(relativeDir, safeName).replace(/\\/g, "/"),
    mimeType: file.type || MIME_BY_EXT[ext] || "application/octet-stream",
    tailleOctets: file.size,
  };
}

export async function deleteArchiveFile(cheminStockage: string): Promise<void> {
  try {
    await unlink(resolveArchivePath(cheminStockage));
  } catch {
    // Fichier déjà absent sur disque
  }
}