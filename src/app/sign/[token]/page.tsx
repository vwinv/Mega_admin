import { notFound } from "next/navigation";
import { getPublicSignSession } from "@/app/actions/signature-public";
import { PublicSignClient } from "@/components/PublicSignClient";

export default async function PublicSignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getPublicSignSession(token);
  if (!session) notFound();

  return <PublicSignClient session={session} />;
}
