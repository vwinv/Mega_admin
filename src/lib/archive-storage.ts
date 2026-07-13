import { mkdir, unlink, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";

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

/**
 * Sur Vercel / Lambda le FS est en lecture seule (sauf /tmp éphémère).
 * On stocke alors le fichier en base (BYTEA). En local / Render avec disque : FS.
 *
 * ARCHIVES_STORAGE=db | fs  — forcer le mode
 * ARCHIVES_DIR=...          — racine FS (sinon data/archives ou /tmp/mega-archives)
 */
export function usesDatabaseArchiveStorage(): boolean {
  const forced = process.env.ARCHIVES_STORAGE?.trim().toLowerCase();
  if (forced === "db") return true;
  if (forced === "fs") return false;
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.NETLIFY
  );
}

function getArchivesRoot(): string {
  const fromEnv = process.env.ARCHIVES_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), "mega-archives");
  }
  return path.join(process.cwd(), "data", "archives");
}

export function isDbArchivePath(cheminStockage: string): boolean {
  return cheminStockage.startsWith("db/");
}

export function resolveArchivePath(cheminStockage: string): string {
  if (isDbArchivePath(cheminStockage)) {
    throw new Error("Ce fichier est stocké en base, pas sur disque.");
  }
  const root = getArchivesRoot();
  const resolved = path.resolve(root, cheminStockage);
  if (!resolved.startsWith(path.resolve(root))) {
    throw new Error("Chemin de fichier invalide.");
  }
  return resolved;
}

export type StoredArchive = {
  cheminStockage: string;
  mimeType: string;
  tailleOctets: number;
  /** Présent uniquement en mode stockage DB */
  contenu?: Uint8Array;
};

export async function saveArchiveFile(
  file: File,
  subdir: string
): Promise<StoredArchive> {
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
  const mimeType = file.type || MIME_BY_EXT[ext] || "application/octet-stream";
  const buffer = new Uint8Array(await file.arrayBuffer());

  if (usesDatabaseArchiveStorage()) {
    return {
      cheminStockage: `db/${relativeDir}/${safeName}`.replace(/\/+/g, "/"),
      mimeType,
      tailleOctets: file.size,
      contenu: buffer,
    };
  }

  const dir = path.join(getArchivesRoot(), relativeDir);
  try {
    await mkdir(dir, { recursive: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ENOENT") || msg.includes("EROFS") || msg.includes("EACCES")) {
      throw new Error(
        "Stockage fichiers indisponible sur ce serveur. Définissez ARCHIVES_STORAGE=db ou ARCHIVES_DIR writable."
      );
    }
    throw e;
  }

  const fullPath = path.join(dir, safeName);
  await writeFile(fullPath, buffer);

  return {
    cheminStockage: path.join(relativeDir, safeName).replace(/\\/g, "/"),
    mimeType,
    tailleOctets: file.size,
  };
}

export async function deleteArchiveFile(cheminStockage: string): Promise<void> {
  if (isDbArchivePath(cheminStockage)) return;
  try {
    await unlink(resolveArchivePath(cheminStockage));
  } catch {
    // Fichier déjà absent sur disque
  }
}
