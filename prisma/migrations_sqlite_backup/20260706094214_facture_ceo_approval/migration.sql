-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Facture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "titre" TEXT,
    "date" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    "devisId" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "reliquat" INTEGER NOT NULL DEFAULT 0,
    "reliquatLabel" TEXT NOT NULL DEFAULT 'Reliquat',
    "tauxTVA" REAL NOT NULL DEFAULT 0.18,
    "montantPaye" INTEGER NOT NULL DEFAULT 0,
    "datePaiement" DATETIME,
    "operationId" TEXT,
    "statutApprobation" TEXT NOT NULL DEFAULT 'APPROUVE',
    "demandePar" TEXT,
    "demandeAt" DATETIME,
    "approuvePar" TEXT,
    "approuveAt" DATETIME,
    "motifRefus" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Facture_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientFacturation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Facture_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Facture" ("clientId", "createdAt", "date", "datePaiement", "devisId", "id", "montantPaye", "notes", "numero", "operationId", "reliquat", "reliquatLabel", "statut", "tauxTVA", "titre", "updatedAt") SELECT "clientId", "createdAt", "date", "datePaiement", "devisId", "id", "montantPaye", "notes", "numero", "operationId", "reliquat", "reliquatLabel", "statut", "tauxTVA", "titre", "updatedAt" FROM "Facture";
DROP TABLE "Facture";
ALTER TABLE "new_Facture" RENAME TO "Facture";
CREATE UNIQUE INDEX "Facture_numero_key" ON "Facture"("numero");
CREATE UNIQUE INDEX "Facture_devisId_key" ON "Facture"("devisId");
CREATE INDEX "Facture_clientId_idx" ON "Facture"("clientId");
CREATE INDEX "Facture_date_idx" ON "Facture"("date");
CREATE INDEX "Facture_statut_idx" ON "Facture"("statut");
CREATE INDEX "Facture_statutApprobation_idx" ON "Facture"("statutApprobation");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
