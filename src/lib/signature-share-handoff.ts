export const SHARE_SOURCE_KEY = "mega-swa-share-source";

export type ShareSourcePayload = {
  id: string;
  titre: string;
  fichierNom: string;
  fichierMime: string | null;
  downloadHref: string;
};

export function stashShareSource(payload: ShareSourcePayload) {
  try {
    sessionStorage.setItem(SHARE_SOURCE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function readShareSource(expectedId?: string): ShareSourcePayload | null {
  try {
    const raw = sessionStorage.getItem(SHARE_SOURCE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as ShareSourcePayload;
    if (!data?.id || !data.fichierNom) return null;
    if (expectedId && data.id !== expectedId) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearShareSource() {
  try {
    sessionStorage.removeItem(SHARE_SOURCE_KEY);
  } catch {
    // ignore
  }
}
