-- Reçus de paiements antérieurs (sans impact trésorerie)
ALTER TABLE "Operation" ADD COLUMN IF NOT EXISTS "historique" BOOLEAN NOT NULL DEFAULT false;
