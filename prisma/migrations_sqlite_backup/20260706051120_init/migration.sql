-- CreateTable
CREATE TABLE "Categorie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "sens" TEXT NOT NULL,
    "codeCompte" TEXT NOT NULL,
    "intituleCompte" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "CodeBudgetaire" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "beneficiaire" TEXT NOT NULL,
    "enveloppe" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Operation" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Operation_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Operation_codeBudgetaireId_fkey" FOREIGN KEY ("codeBudgetaireId") REFERENCES "CodeBudgetaire" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OperationCaisse" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OperationCaisse_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OperationCaisse_codeBudgetaireId_fkey" FOREIGN KEY ("codeBudgetaireId") REFERENCES "CodeBudgetaire" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Parametre" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "entreprise" TEXT NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'FCFA',
    "annee" INTEGER NOT NULL,
    "soldeInitialBanque" INTEGER NOT NULL,
    "soldeInitialCaisse" INTEGER NOT NULL,
    "plafondCaisse" INTEGER NOT NULL DEFAULT 300000,
    "seuilDoubleValidation" INTEGER NOT NULL DEFAULT 500000,
    "tauxTVA" REAL NOT NULL DEFAULT 0.18
);

-- CreateTable
CREATE TABLE "EcheanceImpot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "echeance" DATETIME NOT NULL,
    "impot" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "montantDu" INTEGER NOT NULL,
    "datePaiement" DATETIME,
    "statut" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "BudgetLigne" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categorieId" TEXT NOT NULL,
    "mois" INTEGER NOT NULL,
    "montant" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "BudgetLigne_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RapprochementBancaire" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "annee" INTEGER NOT NULL,
    "mois" INTEGER NOT NULL,
    "soldeReleve" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "annee" INTEGER NOT NULL,
    "mois" INTEGER NOT NULL,
    "tacheId" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'À faire'
);

-- CreateIndex
CREATE UNIQUE INDEX "Categorie_nom_key" ON "Categorie"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "CodeBudgetaire_code_key" ON "CodeBudgetaire"("code");

-- CreateIndex
CREATE INDEX "Operation_date_idx" ON "Operation"("date");

-- CreateIndex
CREATE INDEX "Operation_categorieId_idx" ON "Operation"("categorieId");

-- CreateIndex
CREATE INDEX "OperationCaisse_date_idx" ON "OperationCaisse"("date");

-- CreateIndex
CREATE INDEX "OperationCaisse_categorieId_idx" ON "OperationCaisse"("categorieId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetLigne_categorieId_mois_key" ON "BudgetLigne"("categorieId", "mois");

-- CreateIndex
CREATE UNIQUE INDEX "RapprochementBancaire_annee_mois_key" ON "RapprochementBancaire"("annee", "mois");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistItem_annee_mois_tacheId_key" ON "ChecklistItem"("annee", "mois", "tacheId");
