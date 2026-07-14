import { JournalClient } from "@/components/JournalClient";
import { PageHeader } from "@/components/ui";
import { getJournalOperations, getReferenceData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const [{ categories, codesBudgetaires, params }, operations] =
    await Promise.all([getReferenceData(), getJournalOperations()]);

  if (!params) {
    return <p>Base non initialisée. Lancez npm run db:seed</p>;
  }

  return (
    <div>
      <PageHeader
        title="Journal"
        description="Opérations banque et mobile money"
      />
      <JournalClient
        operations={operations}
        categories={categories}
        codesBudgetaires={codesBudgetaires}
        params={{
          annee: params.annee,
          devise: params.devise,
          seuilDoubleValidation: params.seuilDoubleValidation,
          soldeInitialCaisse: params.soldeInitialCaisse,
          tauxTVA: params.tauxTVA,
        }}
      />
    </div>
  );
}
