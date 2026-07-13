import { CodesBudgetairesClient } from "@/components/CodesBudgetairesClient";
import { PageHeader } from "@/components/ui";
import { getDepenseParCodeBudgetaire } from "@/lib/budget";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CodesBudgetairesPage() {
  const params = await prisma.parametre.findFirst();
  if (!params) return <p>Base non initialisée.</p>;

  const codes = await getDepenseParCodeBudgetaire();

  return (
    <div>
      <PageHeader
        title="Codes budgétaires"
        description="Enveloppes et grants par bénéficiaire"
      />
      <CodesBudgetairesClient codes={codes} devise={params.devise} />
    </div>
  );
}
