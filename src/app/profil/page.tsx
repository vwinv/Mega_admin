import { ProfilClient } from "@/components/ProfilClient";
import { getUserSignatureImage } from "@/app/actions/signatures";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, savedSignature] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.id },
      select: { passwordHash: true, googleId: true },
    }),
    getUserSignatureImage(),
  ]);

  return (
    <ProfilClient
      hasPassword={Boolean(user?.passwordHash)}
      usesGoogle={Boolean(user?.googleId)}
      savedSignature={savedSignature}
    />
  );
}
