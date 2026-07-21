import { notFound } from "next/navigation";
import { RecuPaiementClient } from "@/components/RecuPaiementClient";
import { PageHeader } from "@/components/ui";
import { getRecuPaiement } from "@/app/actions/facturation";

export const dynamic = "force-dynamic";

export default async function RecuPaiementPage({
  params,
}: {
  params: Promise<{ id: string; operationId: string }>;
}) {
  const { id, operationId } = await params;
  const recu = await getRecuPaiement(operationId);
  if (!recu || recu.facture.id !== id) notFound();

  return (
    <div>
      <PageHeader
        title={`Reçu de paiement · tranche ${recu.tranche}`}
        description={`Facture N°${recu.facture.numero} · ${recu.facture.clientNom}`}
      />
      <RecuPaiementClient recu={recu} />
    </div>
  );
}
