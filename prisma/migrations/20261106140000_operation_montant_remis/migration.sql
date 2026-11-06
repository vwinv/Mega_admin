-- Remise / abandon de créance lié à un paiement (reçu)
ALTER TABLE "Operation" ADD COLUMN IF NOT EXISTS "montantRemis" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Operation" ADD COLUMN IF NOT EXISTS "remisMotif" TEXT;
