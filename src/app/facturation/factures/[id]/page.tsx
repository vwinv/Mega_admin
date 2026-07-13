import { notFound } from "next/navigation";
import { FactureDetailClient } from "@/components/FactureDetailClient";
import { PageHeader } from "@/components/ui";
import { getFactureComplet, listClients } from "@/app/actions/facturation";
import { listPiecesFacture } from "@/app/actions/pieces-comptables";
import { getSession } from "@/lib/auth";
import { canWrite } from "@/lib/roles";
import { computeTotauxFacture } from "@/lib/facturation";

export const dynamic = "force-dynamic";

export default async function FacturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const clients = await listClients();

  if (id === "nouveau") {
    const today = new Date().toISOString().slice(0, 10);
    return (
      <div>
        <PageHeader title="Nouvelle facture" description="Création d'une facture client" />
        <FactureDetailClient
          facture={{
            titre: "",
            date: today,
            statut: "BROUILLON",
            clientId: clients[0]?.id ?? "",
            reliquat: 0,
            reliquatLabel: "Reliquat",
            tauxTVA: 0.18,
            montantPaye: 0,
            statutApprobation: "APPROUVE",
            lignes: [],
            totaux: computeTotauxFacture([], 0, 0.18, 0),
            entreprise: null,
          }}
          clients={clients}
          pieces={[]}
          canEdit={session ? canWrite(session.role) : false}
        />
      </div>
    );
  }

  const facture = await getFactureComplet(id);
  if (!facture) notFound();
  const pieces = await listPiecesFacture(id);

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
          tauxTVA: facture.tauxTVA,
          montantPaye: facture.montantPaye,
          datePaiement: facture.datePaiement,
          operationId: facture.operationId,
          statutApprobation: facture.statutApprobation,
          motifRefus: facture.motifRefus,
          devis: facture.devis,
          lignes: facture.lignes,
          totaux: facture.totaux,
          entreprise: facture.entreprise,
        }}
        clients={clients}
        pieces={pieces}
        canEdit={session ? canWrite(session.role) : false}
      />
    </div>
  );
}
