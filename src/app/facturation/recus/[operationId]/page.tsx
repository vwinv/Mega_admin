import { notFound } from "next/navigation";
import { RecuPaiementClient } from "@/components/RecuPaiementClient";
import { PageHeader } from "@/components/ui";
import { getRecuPaiement } from "@/app/actions/facturation";

export const dynamic = "force-dynamic";

export default async function RecuDetailPage({
  params,
}: {
  params: Promise<{ operationId: string }>;
}) {
  const { operationId } = await params;
  const recu = await getRecuPaiement(operationId);
  if (!recu) notFound();

  return (
    <div>
      <PageHeader
        title={`Reçu de paiement · tranche ${recu.tranche}`}
        description={`Facture N°${recu.facture.numero} · ${recu.facture.clientNom}`}
      />
      <RecuPaiementClient recu={recu} backHref="/facturation/recus" />
    </div>
  );
}
