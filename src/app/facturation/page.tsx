import { FacturationClient } from "@/components/FacturationClient";
import { PageHeader } from "@/components/ui";
import {
  getFacturationStats,
  listClients,
  listDevis,
  listFactures,
} from "@/app/actions/facturation";
import { getSession } from "@/lib/auth";
import { canWrite } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function FacturationPage() {
  const session = await getSession();
  const [stats, devis, factures, clients] = await Promise.all([
    getFacturationStats(),
    listDevis(),
    listFactures(),
    listClients(),
  ]);

  return (
    <div>
      <PageHeader
        title="Facturation"
        description="Devis, factures clients et lien avec le journal des encaissements"
      />
      <FacturationClient
        stats={stats}
        devis={devis}
        factures={factures}
        clients={clients}
        canEdit={session ? canWrite(session.role) : false}
      />
    </div>
  );
}
