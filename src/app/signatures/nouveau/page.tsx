import { Suspense } from "react";
import { SignatureWizardClient } from "@/components/SignatureWizardClient";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NouveauSignaturePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
          Chargement du parcours de signature…
        </div>
      }
    >
      <SignatureWizardClient />
    </Suspense>
  );
}
