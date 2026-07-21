import { ClientsClient } from "@/components/ClientsClient";
import { PageHeader } from "@/components/ui";
import { listClients } from "@/app/actions/facturation";
import { getSession } from "@/lib/auth";
import { canWrite } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const session = await getSession();
  const clients = await listClients();

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Répertoire des clients pour devis et factures"
      />
      <ClientsClient
        clients={clients}
        canEdit={session ? canWrite(session.role) : false}
      />
    </div>
  );
}
