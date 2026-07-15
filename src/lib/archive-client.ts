/** Helpers sûrs côté client (pas de fs/node). */

export const MAX_ARCHIVE_BYTES = 15 * 1024 * 1024;

export function buildBlobPathname(subdir: string, originalName: string): string {
  const dot = originalName.lastIndexOf(".");
  const ext =
    dot >= 0 ? originalName.slice(dot).toLowerCase() : ".bin";
  const relativeDir = subdir.replace(/\\/g, "/").replace(/^\/+/, "");
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `archives/${relativeDir}/${id}${ext}`.replace(/\/+/g, "/");
}
