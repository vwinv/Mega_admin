import { notFound } from "next/navigation";
import { DevisDetailClient } from "@/components/DevisDetailClient";
import { PageHeader } from "@/components/ui";
import { getDevisComplet, listClients } from "@/app/actions/facturation";
import { getSession } from "@/lib/auth";
import { canWrite } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DevisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const clients = await listClients();

  if (id === "nouveau") {
    const today = new Date().toISOString().slice(0, 10);
    const paramsDb = await prisma.parametre.findFirst();
    return (
      <div>
        <PageHeader title="Nouveau devis" description="Création d'un devis client" />
        <DevisDetailClient
          devis={{
            titre: "",
            date: today,
            statut: "BROUILLON",
            clientId: clients[0]?.id ?? "",
            reliquat: 0,
            reliquatLabel: "Reliquat",
            tauxTVA: 0,
            lignes: [],
            totalHT: 0,
            entreprise: paramsDb
              ? {
                  entreprise: paramsDb.entreprise,
                  emailContact: paramsDb.emailContact,
                  telephoneContact: paramsDb.telephoneContact,
                  tauxTVA: paramsDb.tauxTVA,
                }
              : { entreprise: "MEGA", tauxTVA: 0.18 },
          }}
          clients={clients}
          canEdit={session ? canWrite(session.role) : false}
        />
      </div>
    );
  }

  const devis = await getDevisComplet(id);
  if (!devis) notFound();

  return (
    <div>
      <PageHeader
        title={`Devis N°${devis.numero}`}
        description={devis.titre}
      />
      <DevisDetailClient
        devis={{
          id: devis.id,
          numero: devis.numero,
          titre: devis.titre,
          date: devis.date,
          statut: devis.statut,
          notes: devis.notes,
          clientId: devis.client.id,
          clientNom: devis.client.nom,
          factureId: devis.factureId,
          reliquat: devis.reliquat,
          reliquatLabel: devis.reliquatLabel,
          tauxTVA: devis.tauxTVA,
          lignes: devis.lignes,
          totalHT: devis.totalHT,
          entreprise: devis.entreprise,
        }}
        clients={clients}
        canEdit={session ? canWrite(session.role) : false}
      />
    </div>
  );
}
