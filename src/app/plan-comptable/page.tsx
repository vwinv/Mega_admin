import { PlanComptableClient } from "@/components/PlanComptableClient";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PlanComptablePage() {
  const params = await prisma.parametre.findFirst();
  if (!params) return <p>Base non initialisée.</p>;

  const categories = await prisma.categorie.findMany({
    orderBy: [{ sens: "asc" }, { nom: "asc" }],
    select: {
      id: true,
      nom: true,
      codeCompte: true,
      intituleCompte: true,
      sens: true,
    },
  });

  return (
    <div>
      <PageHeader
        title="Plan comptable"
        description="Correspondance catégorie → code (SYSCOHADA / OHADA)"
      />
      <PlanComptableClient categories={categories} />
    </div>
  );
}
