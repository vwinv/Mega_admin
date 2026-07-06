import { redirect } from "next/navigation";
import { ImportClient } from "@/components/ImportClient";
import { PageHeader } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { canImport } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const session = await getSession();
  if (!session || !canImport(session.role)) {
    redirect("/");
  }

  return (
    <div>
      <PageHeader
        title="Import Excel"
        description="Mettre à jour la base de données depuis votre classeur Excel"
      />
      <ImportClient />
    </div>
  );
}
