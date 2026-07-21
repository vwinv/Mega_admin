import { FacturationClient } from "@/components/FacturationClient";
import { PageHeader } from "@/components/ui";
import {
  getFacturationStats,
  listDevis,
  listFactures,
} from "@/app/actions/facturation";
import { getSession } from "@/lib/auth";
import { canWrite } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function FacturationPage() {
  const session = await getSession();
  const [stats, devis, factures] = await Promise.all([
    getFacturationStats(),
    listDevis(),
    listFactures(),
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
        canEdit={session ? canWrite(session.role) : false}
      />
    </div>
  );
}
