"use server";

import { revalidatePath } from "next/cache";
import {
  approveOperation,
  rejectOperation,
} from "@/app/actions/approbations";
import { guardAuth, guardWrite, isGuardError } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  SOURCE_SIGNATURE_LABELS,
  STATUT_SIGNATURE_LABELS,
  type SignatureSourceType,
  validateSignatureImage,
} from "@/lib/signatures";

const PATHS = ["/signatures", "/approbations", "/profil"];

function revalidateSignaturePaths() {
  for (const p of PATHS) revalidatePath(p);
}

export type SignatureRow = {
  id: string;
  titre: string;
  statut: string;
  statutLabel: string;
  sourceType: SignatureSourceType;
  sourceLabel: string;
  sourceId: string;
  montant: number;
  demandeParNom: string | null;
  demandeAt: string | null;
  signataireNom: string | null;
  signeAt: string | null;
  motifRefus: string | null;
  hasSignatureImage: boolean;
};

function mapRow(row: {
  id: string;
  titre: string;
  statut: string;
  sourceType: string;
  sourceId: string;
  montant: number;
  demandeParNom: string | null;
  createdAt: Date;
  signataireNom: string | null;
  signeAt: Date | null;
  motifRefus: string | null;
  signatureImage: string | null;
}): SignatureRow {
  const sourceType = row.sourceType as SignatureSourceType;
  return {
    id: row.id,
    titre: row.titre,
    statut: row.statut,
    statutLabel:
      STATUT_SIGNATURE_LABELS[
        row.statut as keyof typeof STATUT_SIGNATURE_LABELS
      ] ?? row.statut,
    sourceType,
    sourceLabel: SOURCE_SIGNATURE_LABELS[sourceType] ?? row.sourceType,
    sourceId: row.sourceId,
    montant: row.montant,
    demandeParNom: row.demandeParNom,
    demandeAt: row.createdAt.toISOString(),
    signataireNom: row.signataireNom,
    signeAt: row.signeAt?.toISOString() ?? null,
    motifRefus: row.motifRefus,
    hasSignatureImage: Boolean(row.signatureImage),
  };
}

export async function getSignatureDemandes(filter: "pending" | "history" | "all") {
  const guard = await guardAuth();
  if (isGuardError(guard)) return [];

  const where =
    filter === "pending"
      ? { statut: "EN_ATTENTE" as const }
      : filter === "history"
        ? { statut: { in: ["SIGNE", "REFUSE"] as string[] } }
        : {};

  const rows = await prisma.signatureDemande.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    take: filter === "history" ? 100 : undefined,
  });

  return rows.map(mapRow);
}

export async function countPendingSignatures(): Promise<number> {
  return prisma.signatureDemande.count({ where: { statut: "EN_ATTENTE" } });
}

export async function getUserSignatureImage(): Promise<string | null> {
  const guard = await guardAuth();
  if (isGuardError(guard)) return null;

  const sig = await prisma.userSignature.findUnique({
    where: { userId: guard.id },
    select: { imageData: true },
  });
  return sig?.imageData ?? null;
}

export async function saveUserSignature(
  imageData: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  const err = validateSignatureImage(imageData);
  if (err) return { ok: false, error: err };

  await prisma.userSignature.upsert({
    where: { userId: guard.id },
    create: {
      userId: guard.id,
      imageData: imageData.trim(),
      type: "DRAWN",
    },
    update: {
      imageData: imageData.trim(),
      type: "DRAWN",
    },
  });

  await logAudit({
    userId: guard.id,
    userNom: guard.nom,
    action: "UPDATE",
    entity: "UserSignature",
    entityId: guard.id,
    details: "Signature enregistrée",
  });

  revalidateSignaturePaths();
  return { ok: true };
}

export async function deleteUserSignature(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  await prisma.userSignature.deleteMany({ where: { userId: guard.id } });
  revalidateSignaturePaths();
  return { ok: true };
}

export async function signApproval(
  sourceId: string,
  source: SignatureSourceType,
  signatureImage: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const err = validateSignatureImage(signatureImage);
  if (err) return { ok: false, error: err };

  return approveOperation(sourceId, source, signatureImage.trim());
}

export async function rejectWithSignature(
  sourceId: string,
  source: SignatureSourceType,
  motif: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  return rejectOperation(sourceId, source, motif);
}

export async function getSignatureDetail(id: string) {
  const guard = await guardAuth();
  if (isGuardError(guard)) return null;

  const row = await prisma.signatureDemande.findUnique({ where: { id } });
  if (!row) return null;

  return {
    ...mapRow(row),
    signatureImage: row.signatureImage,
  };
}

export { approveOperation, rejectOperation };
