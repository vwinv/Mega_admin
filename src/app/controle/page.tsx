import { ControleClient } from "@/components/ControleClient";
import { PageHeader } from "@/components/ui";
import { runControles } from "@/lib/controles";
import { getChecklist, getRapprochements } from "@/lib/rapprochement";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ControlePage() {
  const params = await prisma.parametre.findFirst();
  if (!params) return <p>Base non initialisée.</p>;

  const [controles, rapprochements, checklist] = await Promise.all([
    runControles(),
    getRapprochements(params.annee),
    getChecklist(params.annee),
  ]);

  return (
    <div>
      <PageHeader
        title="Contrôle financier"
        description="13 contrôles automatiques, rapprochement bancaire et checklist mensuelle"
      />
      <ControleClient
        controles={controles}
        rapprochements={rapprochements}
        checklist={checklist}
        annee={params.annee}
      />
    </div>
  );
}
