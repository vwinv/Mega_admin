-- CreateTable
CREATE TABLE "UserSignature" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "imageData" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'DRAWN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureDemande" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "montant" INTEGER NOT NULL DEFAULT 0,
    "demandeParId" TEXT,
    "demandeParNom" TEXT,
    "signataireId" TEXT,
    "signataireNom" TEXT,
    "signeAt" TIMESTAMP(3),
    "signatureImage" TEXT,
    "motifRefus" TEXT,
    "hashContenu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignatureDemande_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSignature_userId_key" ON "UserSignature"("userId");

-- CreateIndex
CREATE INDEX "SignatureDemande_statut_idx" ON "SignatureDemande"("statut");

-- CreateIndex
CREATE INDEX "SignatureDemande_signataireId_idx" ON "SignatureDemande"("signataireId");

-- CreateIndex
CREATE UNIQUE INDEX "SignatureDemande_sourceType_sourceId_key" ON "SignatureDemande"("sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "UserSignature" ADD CONSTRAINT "UserSignature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
