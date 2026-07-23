import { getUserSignatureImage } from "@/app/actions/signatures";
import { SignatureEditorClient } from "@/components/SignatureEditorClient";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SignatureEditerPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const savedSignature = await getUserSignatureImage();
  return <SignatureEditorClient savedSignature={savedSignature} />;
}
