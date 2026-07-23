-- AlterTable
ALTER TABLE "SignatureDestinataire" ADD COLUMN IF NOT EXISTS "accessToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SignatureDestinataire_accessToken_key" ON "SignatureDestinataire"("accessToken");
