import { getPendingApprovals } from "@/app/actions/approbations";
import { getUserSignatureImage } from "@/app/actions/signatures";
import { ApprobationsClient } from "@/components/ApprobationsClient";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ApprobationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [rows, savedSignature] = await Promise.all([
    getPendingApprovals(),
    getUserSignatureImage(),
  ]);
  return <ApprobationsClient rows={rows} savedSignature={savedSignature} />;
}
