-- AlterTable
ALTER TABLE "Operation" ADD COLUMN     "factureId" TEXT;

-- CreateTable
CREATE TABLE "PieceComptable" (
    "id" TEXT NOT NULL,
    "nomOriginal" TEXT NOT NULL,
    "cheminStockage" TEXT NOT NULL,
    "mimeType" TEXT,
    "tailleOctets" INTEGER,
    "typeDocument" TEXT NOT NULL DEFAULT 'FACTURE',
    "libelle" TEXT,
    "factureId" TEXT,
    "operationId" TEXT,
    "operationCaisseId" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PieceComptable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PieceComptable_factureId_idx" ON "PieceComptable"("factureId");

-- CreateIndex
CREATE INDEX "PieceComptable_operationId_idx" ON "PieceComptable"("operationId");

-- CreateIndex
CREATE INDEX "PieceComptable_operationCaisseId_idx" ON "PieceComptable"("operationCaisseId");

-- CreateIndex
CREATE INDEX "PieceComptable_createdAt_idx" ON "PieceComptable"("createdAt");

-- CreateIndex
CREATE INDEX "Operation_factureId_idx" ON "Operation"("factureId");

-- CreateIndex
CREATE INDEX "Operation_numeroPiece_idx" ON "Operation"("numeroPiece");

-- CreateIndex
CREATE INDEX "OperationCaisse_numeroPiece_idx" ON "OperationCaisse"("numeroPiece");

-- AddForeignKey
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PieceComptable" ADD CONSTRAINT "PieceComptable_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PieceComptable" ADD CONSTRAINT "PieceComptable_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PieceComptable" ADD CONSTRAINT "PieceComptable_operationCaisseId_fkey" FOREIGN KEY ("operationCaisseId") REFERENCES "OperationCaisse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
