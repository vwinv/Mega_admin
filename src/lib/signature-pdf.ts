import { readArchiveBytes, isDbArchivePath } from "@/lib/archive-storage";
import { buildSignedPdf, type StampAnnotation } from "@/lib/signature-flatten";
import { prisma } from "@/lib/prisma";

type ChampLike = {
  type: string;
  valeur: string | null;
  posX: number;
  posY: number;
  largeur: number;
  hauteur: number;
  page: number;
  destinataireId: string | null;
};

type DestLike = {
  id: string;
  signatureImage: string | null;
};

/** Valeur affichable : champ rempli, sinon image du destinataire pour signature/paraphe. */
export function resolveChampValeur(
  champ: ChampLike,
  destById: Map<string, DestLike>
): string | null {
  const v = champ.valeur?.trim();
  if (v) return v;
  if (!champ.destinataireId) return null;
  const dest = destById.get(champ.destinataireId);
  if (!dest?.signatureImage) return null;
  const t = champ.type.toUpperCase();
  if (t === "SIGNATURE" || t === "PARAPHE" || t === "INITIALES") {
    return dest.signatureImage;
  }
  return null;
}

export function buildAnnotationsFromEnvelope(
  champs: ChampLike[],
  destinataires: DestLike[]
): StampAnnotation[] {
  const destById = new Map(destinataires.map((d) => [d.id, d]));
  return champs.map((c) => ({
    type: c.type,
    valeur: resolveChampValeur(c, destById),
    posX: c.posX,
    posY: c.posY,
    largeur: c.largeur,
    hauteur: c.hauteur,
    page: c.page,
  }));
}

export async function buildSignedPdfForEnvelope(
  envelopeId: string
): Promise<{ bytes: Uint8Array; fileName: string } | null> {
  const envelope = await prisma.signatureEnvelope.findUnique({
    where: { id: envelopeId },
    include: {
      champs: { orderBy: { createdAt: "asc" } },
      destinataires: true,
    },
  });
  if (!envelope) return null;

  if (
    (!envelope.fichierContenu || envelope.fichierContenu.length === 0) &&
    isDbArchivePath(envelope.fichierChemin)
  ) {
    return null;
  }

  const body = await readArchiveBytes(
    envelope.fichierChemin,
    envelope.fichierContenu
  );

  return buildSignedPdf({
    fileBytes: new Uint8Array(body),
    fileMime: envelope.fichierMime ?? "application/octet-stream",
    fileName: envelope.fichierNom,
    annotations: buildAnnotationsFromEnvelope(
      envelope.champs,
      envelope.destinataires
    ),
  });
}
