-- CreateTable
CREATE TABLE "SignatureEnvelope" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "objet" TEXT,
    "message" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "ordreObligatoire" BOOLEAN NOT NULL DEFAULT true,
    "rappelFrequence" TEXT NOT NULL DEFAULT 'HEBDO',
    "createurId" TEXT,
    "createurNom" TEXT NOT NULL,
    "fichierNom" TEXT NOT NULL,
    "fichierMime" TEXT,
    "fichierChemin" TEXT NOT NULL,
    "fichierContenu" BYTEA,
    "fichierTaille" INTEGER,
    "envoyeAt" TIMESTAMP(3),
    "completeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignatureEnvelope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureDestinataire" (
    "id" TEXT NOT NULL,
    "envelopeId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SIGNATAIRE',
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "userId" TEXT,
    "signatureImage" TEXT,
    "signeAt" TIMESTAMP(3),
    "motifRefus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignatureDestinataire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureChamp" (
    "id" TEXT NOT NULL,
    "envelopeId" TEXT NOT NULL,
    "destinataireId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'SIGNATURE',
    "page" INTEGER NOT NULL DEFAULT 1,
    "posX" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "posY" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "largeur" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "hauteur" DOUBLE PRECISION NOT NULL DEFAULT 0.08,
    "valeur" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignatureChamp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SignatureEnvelope_statut_idx" ON "SignatureEnvelope"("statut");
CREATE INDEX "SignatureEnvelope_createurId_idx" ON "SignatureEnvelope"("createurId");
CREATE INDEX "SignatureEnvelope_createdAt_idx" ON "SignatureEnvelope"("createdAt");
CREATE INDEX "SignatureDestinataire_envelopeId_idx" ON "SignatureDestinataire"("envelopeId");
CREATE INDEX "SignatureDestinataire_email_idx" ON "SignatureDestinataire"("email");
CREATE INDEX "SignatureDestinataire_userId_idx" ON "SignatureDestinataire"("userId");
CREATE INDEX "SignatureDestinataire_statut_idx" ON "SignatureDestinataire"("statut");
CREATE INDEX "SignatureChamp_envelopeId_idx" ON "SignatureChamp"("envelopeId");
CREATE INDEX "SignatureChamp_destinataireId_idx" ON "SignatureChamp"("destinataireId");

-- AddForeignKey
ALTER TABLE "SignatureDestinataire" ADD CONSTRAINT "SignatureDestinataire_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "SignatureEnvelope"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SignatureChamp" ADD CONSTRAINT "SignatureChamp_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "SignatureEnvelope"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SignatureChamp" ADD CONSTRAINT "SignatureChamp_destinataireId_fkey" FOREIGN KEY ("destinataireId") REFERENCES "SignatureDestinataire"("id") ON DELETE SET NULL ON UPDATE CASCADE;
