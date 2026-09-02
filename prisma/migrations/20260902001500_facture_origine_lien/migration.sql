-- Lien entre factures d'un même dossier (reliquat reporté)
ALTER TABLE "Facture" ADD COLUMN "factureOrigineId" TEXT;

CREATE INDEX "Facture_factureOrigineId_idx" ON "Facture"("factureOrigineId");

ALTER TABLE "Facture" ADD CONSTRAINT "Facture_factureOrigineId_fkey"
  FOREIGN KEY ("factureOrigineId") REFERENCES "Facture"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
