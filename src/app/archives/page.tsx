import { ArchivesClient } from "@/components/ArchivesClient";
import { PageHeader } from "@/components/ui";
import {
  getArchivesStats,
  listArchives,
  listFacturesArchives,
} from "@/app/actions/pieces-comptables";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ArchivesPage() {
  const params = await prisma.parametre.findFirst();
  const annee = params?.annee ?? new Date().getFullYear();

  const [pieces, factures, stats] = await Promise.all([
    listArchives(),
    listFacturesArchives(),
    getArchivesStats(),
  ]);

  return (
    <div>
      <PageHeader
        title="Archives"
        description="Toutes les pièces comptables et factures, organisées par mois et par source"
      />
      <ArchivesClient
        pieces={pieces}
        factures={factures}
        stats={stats}
        annee={annee}
      />
    </div>
  );
}
