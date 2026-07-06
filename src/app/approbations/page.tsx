import { getPendingApprovals } from "@/app/actions/approbations";
import { ApprobationsClient } from "@/components/ApprobationsClient";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ApprobationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const rows = await getPendingApprovals();
  return <ApprobationsClient rows={rows} />;
}
