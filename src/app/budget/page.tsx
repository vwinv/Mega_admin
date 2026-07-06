import { BudgetClient } from "@/components/BudgetClient";
import { PageHeader } from "@/components/ui";
import { getBudgetData } from "@/lib/budget";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  const params = await prisma.parametre.findFirst();
  if (!params) return <p>Base non initialisée.</p>;

  const { lignes, moisLabels } = await getBudgetData(params.annee);

  return (
    <div>
      <PageHeader
        title="Budget"
        description="Budget prévisionnel, réalisé et écarts · structure identique au fichier Excel"
      />
      <BudgetClient
        lignes={lignes}
        moisLabels={moisLabels}
        annee={params.annee}
      />
    </div>
  );
}
