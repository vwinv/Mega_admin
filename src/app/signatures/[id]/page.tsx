import { getEnvelopeDetail } from "@/app/actions/signature-docs";
import { getUserSignatureImage } from "@/app/actions/signatures";
import { SignatureDocumentClient } from "@/components/SignatureDocumentClient";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SignatureDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const [detail, savedSignature] = await Promise.all([
    getEnvelopeDetail(id),
    getUserSignatureImage(),
  ]);

  if (!detail) notFound();

  return (
    <SignatureDocumentClient
      detail={detail}
      savedSignature={savedSignature}
    />
  );
}
