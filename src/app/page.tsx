import { redirect } from "next/navigation";
import { AppsLauncher } from "@/components/AppsLauncher";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppsHomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <AppsLauncher user={session} />;
}
