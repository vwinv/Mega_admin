-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Operation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME,
    "numeroPiece" TEXT,
    "libelle" TEXT NOT NULL,
    "categorieId" TEXT NOT NULL,
    "codeBudgetaireId" TEXT,
    "modePaiement" TEXT,
    "entree" INTEGER,
    "sortie" INTEGER,
    "observations" TEXT,
    "validePar" TEXT,
    "statutApprobation" TEXT NOT NULL DEFAULT 'APPROUVE',
    "demandePar" TEXT,
    "demandeAt" DATETIME,
    "approuvePar" TEXT,
    "approuveAt" DATETIME,
    "motifRefus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Operation_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Operation_codeBudgetaireId_fkey" FOREIGN KEY ("codeBudgetaireId") REFERENCES "CodeBudgetaire" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Operation" ("categorieId", "codeBudgetaireId", "createdAt", "date", "entree", "id", "libelle", "modePaiement", "numeroPiece", "observations", "sortie", "updatedAt", "validePar") SELECT "categorieId", "codeBudgetaireId", "createdAt", "date", "entree", "id", "libelle", "modePaiement", "numeroPiece", "observations", "sortie", "updatedAt", "validePar" FROM "Operation";
DROP TABLE "Operation";
ALTER TABLE "new_Operation" RENAME TO "Operation";
CREATE INDEX "Operation_date_idx" ON "Operation"("date");
CREATE INDEX "Operation_categorieId_idx" ON "Operation"("categorieId");
CREATE INDEX "Operation_statutApprobation_idx" ON "Operation"("statutApprobation");
CREATE TABLE "new_OperationCaisse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME,
    "numeroPiece" TEXT,
    "libelle" TEXT NOT NULL,
    "categorieId" TEXT NOT NULL,
    "codeBudgetaireId" TEXT,
    "entree" INTEGER,
    "sortie" INTEGER,
    "observations" TEXT,
    "validePar" TEXT,
    "statutApprobation" TEXT NOT NULL DEFAULT 'APPROUVE',
    "demandePar" TEXT,
    "demandeAt" DATETIME,
    "approuvePar" TEXT,
    "approuveAt" DATETIME,
    "motifRefus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OperationCaisse_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OperationCaisse_codeBudgetaireId_fkey" FOREIGN KEY ("codeBudgetaireId") REFERENCES "CodeBudgetaire" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OperationCaisse" ("categorieId", "codeBudgetaireId", "createdAt", "date", "entree", "id", "libelle", "numeroPiece", "observations", "sortie", "updatedAt", "validePar") SELECT "categorieId", "codeBudgetaireId", "createdAt", "date", "entree", "id", "libelle", "numeroPiece", "observations", "sortie", "updatedAt", "validePar" FROM "OperationCaisse";
DROP TABLE "OperationCaisse";
ALTER TABLE "new_OperationCaisse" RENAME TO "OperationCaisse";
CREATE INDEX "OperationCaisse_date_idx" ON "OperationCaisse"("date");
CREATE INDEX "OperationCaisse_categorieId_idx" ON "OperationCaisse"("categorieId");
CREATE INDEX "OperationCaisse_statutApprobation_idx" ON "OperationCaisse"("statutApprobation");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
