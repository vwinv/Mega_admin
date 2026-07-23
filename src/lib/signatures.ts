import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export const STATUTS_SIGNATURE = ["EN_ATTENTE", "SIGNE", "REFUSE", "ANNULE"] as const;
export type StatutSignature = (typeof STATUTS_SIGNATURE)[number];
export type SignatureSourceType = "journal" | "caisse" | "facture";

export const STATUT_SIGNATURE_LABELS: Record<StatutSignature, string> = {
  EN_ATTENTE: "En attente de signature",
  SIGNE: "Signé",
  REFUSE: "Refusé",
  ANNULE: "Annulé",
};

export const SOURCE_SIGNATURE_LABELS: Record<SignatureSourceType, string> = {
  journal: "Journal",
  caisse: "Petite caisse",
  facture: "Facture",
};

const SIGNATURE_DATA_URL_RE =
  /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i;

export function validateSignatureImage(imageData: string): string | null {
  const trimmed = imageData.trim();
  if (!trimmed) return "La signature est obligatoire.";
  if (!SIGNATURE_DATA_URL_RE.test(trimmed)) {
    return "Format de signature invalide.";
  }
  // ~1.5 Mo en data URL (PNG transparent)
  if (trimmed.length > 1_500_000) {
    return "Signature trop volumineuse.";
  }
  return null;
}

export function computeContentHash(parts: Record<string, string | number | null | undefined>) {
  const payload = Object.entries(parts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v ?? ""}`)
    .join("|");
  return createHash("sha256").update(payload).digest("hex");
}

async function findCeoSignataire() {
  const ceo = await prisma.user.findFirst({
    where: { role: "CEO", actif: true },
    select: { id: true, nom: true },
  });
  return ceo;
}

export async function ensureSignatureDemande(input: {
  sourceType: SignatureSourceType;
  sourceId: string;
  titre: string;
  montant: number;
  demandeParId?: string | null;
  demandeParNom?: string | null;
  hashContenu: string;
}) {
  const ceo = await findCeoSignataire();
  const existing = await prisma.signatureDemande.findUnique({
    where: {
      sourceType_sourceId: {
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      },
    },
  });

  if (existing?.statut === "SIGNE") return existing;

  return prisma.signatureDemande.upsert({
    where: {
      sourceType_sourceId: {
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      },
    },
    create: {
      titre: input.titre,
      statut: "EN_ATTENTE",
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      montant: input.montant,
      demandeParId: input.demandeParId ?? null,
      demandeParNom: input.demandeParNom ?? null,
      signataireId: ceo?.id ?? null,
      signataireNom: ceo?.nom ?? "CEO",
      hashContenu: input.hashContenu,
    },
    update: {
      titre: input.titre,
      montant: input.montant,
      statut: "EN_ATTENTE",
      demandeParId: input.demandeParId ?? null,
      demandeParNom: input.demandeParNom ?? null,
      signataireId: ceo?.id ?? null,
      signataireNom: ceo?.nom ?? "CEO",
      hashContenu: input.hashContenu,
      signeAt: null,
      signatureImage: null,
      motifRefus: null,
    },
  });
}

export async function markSignatureSigned(
  sourceType: SignatureSourceType,
  sourceId: string,
  signatureImage: string,
  signataire: { id: string; nom: string }
) {
  await prisma.signatureDemande.updateMany({
    where: { sourceType, sourceId, statut: "EN_ATTENTE" },
    data: {
      statut: "SIGNE",
      signatureImage,
      signataireId: signataire.id,
      signataireNom: signataire.nom,
      signeAt: new Date(),
      motifRefus: null,
    },
  });
}

export async function markSignatureRefused(
  sourceType: SignatureSourceType,
  sourceId: string,
  motif: string,
  signataire: { id: string; nom: string }
) {
  await prisma.signatureDemande.updateMany({
    where: { sourceType, sourceId, statut: "EN_ATTENTE" },
    data: {
      statut: "REFUSE",
      motifRefus: motif,
      signataireId: signataire.id,
      signataireNom: signataire.nom,
      signeAt: new Date(),
    },
  });
}

export async function syncSignatureForJournalOperation(
  operationId: string,
  demandePar: { id: string; nom: string }
) {
  const op = await prisma.operation.findUnique({
    where: { id: operationId },
    include: { categorie: true },
  });
  if (!op || op.statutApprobation !== "EN_ATTENTE_CEO") return;

  const montant = op.entree ?? op.sortie ?? 0;
  await ensureSignatureDemande({
    sourceType: "journal",
    sourceId: op.id,
    titre: op.libelle,
    montant,
    demandeParId: demandePar.id,
    demandeParNom: demandePar.nom,
    hashContenu: computeContentHash({
      sourceType: "journal",
      sourceId: op.id,
      libelle: op.libelle,
      montant,
      date: op.date?.toISOString() ?? "",
    }),
  });
}

export async function syncSignatureForCaisseOperation(
  operationId: string,
  demandePar: { id: string; nom: string }
) {
  const op = await prisma.operationCaisse.findUnique({
    where: { id: operationId },
    include: { categorie: true },
  });
  if (!op || op.statutApprobation !== "EN_ATTENTE_CEO") return;

  const montant = op.entree ?? op.sortie ?? 0;
  await ensureSignatureDemande({
    sourceType: "caisse",
    sourceId: op.id,
    titre: op.libelle,
    montant,
    demandeParId: demandePar.id,
    demandeParNom: demandePar.nom,
    hashContenu: computeContentHash({
      sourceType: "caisse",
      sourceId: op.id,
      libelle: op.libelle,
      montant,
      date: op.date?.toISOString() ?? "",
    }),
  });
}

export async function syncSignatureForFacture(
  factureId: string,
  demandePar: { id: string; nom: string }
) {
  const f = await prisma.facture.findUnique({
    where: { id: factureId },
    include: { client: true, lignes: true },
  });
  if (!f || f.statutApprobation !== "EN_ATTENTE_CEO") return;

  const montant = f.lignes.reduce((s, l) => s + l.prix, 0) + f.reliquat;
  await ensureSignatureDemande({
    sourceType: "facture",
    sourceId: f.id,
    titre: `Facture ${f.numero} · ${f.client.nom}`,
    montant,
    demandeParId: demandePar.id,
    demandeParNom: demandePar.nom,
    hashContenu: computeContentHash({
      sourceType: "facture",
      sourceId: f.id,
      numero: f.numero,
      montant,
      date: f.date.toISOString(),
    }),
  });
}
