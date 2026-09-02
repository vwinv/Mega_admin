import { notFound } from "next/navigation";
import { FactureDetailClient } from "@/components/FactureDetailClient";
import { PageHeader } from "@/components/ui";
import {
  getFactureComplet,
  listClients,
  listPaiementsFacture,
} from "@/app/actions/facturation";
import { listPiecesFacture } from "@/app/actions/pieces-comptables";
import { getSession } from "@/lib/auth";
import { canWrite } from "@/lib/roles";
import { computeTotauxFacture } from "@/lib/facturation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FacturePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ origine?: string }>;
}) {
  const { id } = await params;
  const { origine } = await searchParams;
  const session = await getSession();
  const clients = await listClients();

  if (id === "nouveau") {
    const today = new Date().toISOString().slice(0, 10);
    const paramsDb = await prisma.parametre.findFirst();
    const tauxDefaut = paramsDb?.tauxTVA ?? 0.18;
    const factureOrigineData = origine ? await getFactureComplet(origine) : null;
    const reliquatPrefill = factureOrigineData?.totaux.resteAPayer ?? 0;
    return (
      <div>
        <PageHeader title="Nouvelle facture" description="Création d'une facture client" />
        <FactureDetailClient
          facture={{
            titre: "",
            date: today,
            statut: "BROUILLON",
            clientId: factureOrigineData?.client.id ?? clients[0]?.id ?? "",
            reliquat: reliquatPrefill,
            reliquatLabel: factureOrigineData
              ? `Reliquat facture ${factureOrigineData.numero}`
              : "Reliquat",
            remiseMontant: 0,
            remisePourcent: 0,
            tauxTVA: 0,
            montantPaye: 0,
            statutApprobation: "APPROUVE",
            factureOrigineId: factureOrigineData?.id ?? null,
            factureOrigine: factureOrigineData
              ? {
                  id: factureOrigineData.id,
                  numero: factureOrigineData.numero,
                  titre: factureOrigineData.titre,
                  resteAPayer: factureOrigineData.totaux.resteAPayer,
                }
              : null,
            dossier: factureOrigineData?.dossier ?? [],
            lignes: [],
            totaux: computeTotauxFacture([], reliquatPrefill, 0, 0),
            entreprise: paramsDb
              ? {
                  entreprise: paramsDb.entreprise,
                  emailContact: paramsDb.emailContact,
                  telephoneContact: paramsDb.telephoneContact,
                  tauxTVA: tauxDefaut,
                }
              : { entreprise: "MEGA", tauxTVA: tauxDefaut },
          }}
          clients={clients}
          pieces={[]}
          paiements={[]}
          canEdit={session ? canWrite(session.role) : false}
        />
      </div>
    );
  }

  const facture = await getFactureComplet(id);
  if (!facture) notFound();
  const [pieces, paiements] = await Promise.all([
    listPiecesFacture(id),
    listPaiementsFacture(id),
  ]);

  return (
    <div>
      <PageHeader
        title={`Facture N°${facture.numero}`}
        description={facture.client.nom}
      />
      <FactureDetailClient
        facture={{
          id: facture.id,
          numero: facture.numero,
          titre: facture.titre,
          date: facture.date,
          statut: facture.statut,
          notes: facture.notes,
          clientId: facture.client.id,
          clientNom: facture.client.nom,
          reliquat: facture.reliquat,
          reliquatLabel: facture.reliquatLabel,
          remiseMontant: facture.remiseMontant,
          remisePourcent: facture.remisePourcent,
          tauxTVA: facture.tauxTVA,
          montantPaye: facture.montantPaye,
          datePaiement: facture.datePaiement,
          operationId: facture.operationId,
          statutApprobation: facture.statutApprobation,
          motifRefus: facture.motifRefus,
          devis: facture.devis,
          factureOrigineId: facture.factureOrigineId,
          factureOrigine: facture.factureOrigine,
          dossier: facture.dossier,
          lignes: facture.lignes,
          totaux: facture.totaux,
          entreprise: facture.entreprise,
        }}
        clients={clients}
        pieces={pieces}
        paiements={paiements}
        canEdit={session ? canWrite(session.role) : false}
      />
    </div>
  );
}
