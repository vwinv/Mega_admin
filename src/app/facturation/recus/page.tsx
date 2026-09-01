import { RecusClient } from "@/components/RecusClient";
import { PageHeader } from "@/components/ui";
import {
  listFacturesPourRecu,
  listRecusPaiement,
} from "@/app/actions/facturation";
import { getSession } from "@/lib/auth";
import { canWrite } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function RecusPage() {
  const session = await getSession();
  const [recus, factures] = await Promise.all([
    listRecusPaiement(),
    listFacturesPourRecu(),
  ]);

  return (
    <div>
      <PageHeader
        title="Reçus de paiement"
        description="Historique des reçus générés · régularisation des paiements antérieurs"
      />
      <RecusClient
        recus={recus}
        factures={factures}
        canEdit={session ? canWrite(session.role) : false}
      />
    </div>
  );
}
