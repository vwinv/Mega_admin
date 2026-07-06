import { CaisseClient } from "@/components/CaisseClient";
import { PageHeader } from "@/components/ui";
import { getCaisseOperations, getReferenceData } from "@/lib/data";
import { getSoldes } from "@/lib/tresorerie";

export const dynamic = "force-dynamic";

export default async function CaissePage() {
  const { categories, codesBudgetaires, params } = await getReferenceData();
  if (!params) {
    return <p>Base non initialisée. Lancez npm run db:seed</p>;
  }

  const [operations, soldes] = await Promise.all([
    getCaisseOperations(params.soldeInitialCaisse),
    getSoldes(),
  ]);

  return (
    <div>
      <PageHeader
        title="Petite caisse"
        description="Opérations en espèces · solde recalculé ligne à ligne"
      />
      <CaisseClient
        operations={operations}
        categories={categories}
        codesBudgetaires={codesBudgetaires}
        params={{
          annee: params.annee,
          devise: params.devise,
          seuilDoubleValidation: params.seuilDoubleValidation,
          soldeInitialCaisse: params.soldeInitialCaisse,
        }}
        soldeActuel={soldes?.soldeCaisse ?? params.soldeInitialCaisse}
      />
    </div>
  );
}
