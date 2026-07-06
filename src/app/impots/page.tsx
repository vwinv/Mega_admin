import { ImpotsClient } from "@/components/ImpotsClient";
import { PageHeader } from "@/components/ui";
import { getEcheances, getTvaMensuelle, syncEcheancesEnRetard } from "@/lib/impots";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ImpotsPage() {
  const params = await prisma.parametre.findFirst();
  if (!params) return <p>Base non initialisée.</p>;

  await syncEcheancesEnRetard();

  const [echeances, tvaMensuelle] = await Promise.all([
    getEcheances(),
    getTvaMensuelle(params.annee),
  ]);

  return (
    <div>
      <PageHeader
        title="Impôts & taxes"
        description="Référentiel fiscal, calculateur TVA et échéancier"
      />
      <ImpotsClient
        echeances={echeances}
        tvaMensuelle={tvaMensuelle}
        annee={params.annee}
        devise={params.devise}
        tauxTVA={params.tauxTVA}
      />
    </div>
  );
}
