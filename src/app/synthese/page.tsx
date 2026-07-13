import { SyntheseClient } from "@/components/SyntheseClient";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getSyntheseComptable } from "@/lib/synthese";

export const dynamic = "force-dynamic";

export default async function SynthesePage() {
  const params = await prisma.parametre.findFirst();
  if (!params) return <p>Base non initialisée.</p>;

  const lignes = await getSyntheseComptable();

  return (
    <div>
      <PageHeader
        title="Synthèse comptable"
        description="Totaux par code compte SYSCOHADA · exportable en CSV"
      />
      <SyntheseClient
        lignes={lignes}
        entreprise={params.entreprise}
        annee={params.annee}
        devise={params.devise}
      />
    </div>
  );
}
