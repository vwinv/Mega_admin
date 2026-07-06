import { ParametresClient } from "@/components/ParametresClient";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ParametresPage() {
  const [params, categories] = await Promise.all([
    prisma.parametre.findFirst(),
    prisma.categorie.findMany({
      orderBy: [{ sens: "asc" }, { nom: "asc" }],
      select: {
        id: true,
        nom: true,
        sens: true,
        codeCompte: true,
        intituleCompte: true,
      },
    }),
  ]);

  if (!params) {
    return (
      <div>
        <PageHeader title="Paramètres" />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8">
          <p className="text-sm text-amber-800">
            Aucun paramètre configuré. Lancez{" "}
            <code className="rounded bg-amber-100 px-1">npm run db:setup</code>{" "}
            ou importez un fichier Excel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Paramètres"
        description="Référentiels, soldes initiaux et règles de l'exercice"
      />
      <ParametresClient
        params={{
          entreprise: params.entreprise,
          devise: params.devise,
          annee: params.annee,
          soldeInitialBanque: params.soldeInitialBanque,
          soldeInitialCaisse: params.soldeInitialCaisse,
          plafondCaisse: params.plafondCaisse,
          seuilDoubleValidation: params.seuilDoubleValidation,
          tauxTVA: params.tauxTVA,
        }}
        categories={categories}
      />
    </div>
  );
}
