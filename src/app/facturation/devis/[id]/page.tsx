import { notFound } from "next/navigation";
import { DevisDetailClient } from "@/components/DevisDetailClient";
import { PageHeader } from "@/components/ui";
import { getDevisComplet, listClients } from "@/app/actions/facturation";
import { getSession } from "@/lib/auth";
import { canWrite } from "@/lib/roles";

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
    return (
      <div>
        <PageHeader title="Nouveau devis" description="Création d'un devis client" />
        <DevisDetailClient
          devis={{
            titre: "",
            date: today,
            statut: "BROUILLON",
            clientId: clients[0]?.id ?? "",
            lignes: [],
            totalHT: 0,
            entreprise: null,
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
