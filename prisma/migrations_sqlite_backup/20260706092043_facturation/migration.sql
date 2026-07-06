-- CreateTable
CREATE TABLE "ClientFacturation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "adresse" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Devis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Devis_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientFacturation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DevisLigne" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "devisId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "designation" TEXT NOT NULL,
    "details" TEXT,
    "duree" TEXT,
    "prix" INTEGER NOT NULL,
    "styleAccent" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "DevisLigne_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Facture" (
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
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Facture_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientFacturation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Facture_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FactureLigne" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "factureId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "designation" TEXT NOT NULL,
    "details" TEXT,
    "prix" INTEGER NOT NULL,
    "styleAccent" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "FactureLigne_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Parametre" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "entreprise" TEXT NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'FCFA',
    "annee" INTEGER NOT NULL,
    "soldeInitialBanque" INTEGER NOT NULL,
    "soldeInitialCaisse" INTEGER NOT NULL,
    "plafondCaisse" INTEGER NOT NULL DEFAULT 300000,
    "seuilDoubleValidation" INTEGER NOT NULL DEFAULT 500000,
    "tauxTVA" REAL NOT NULL DEFAULT 0.18,
    "emailContact" TEXT NOT NULL DEFAULT 'contact@mega-sn.com',
    "telephoneContact" TEXT NOT NULL DEFAULT '78 450 40 52'
);
INSERT INTO "new_Parametre" ("annee", "devise", "entreprise", "id", "plafondCaisse", "seuilDoubleValidation", "soldeInitialBanque", "soldeInitialCaisse", "tauxTVA") SELECT "annee", "devise", "entreprise", "id", "plafondCaisse", "seuilDoubleValidation", "soldeInitialBanque", "soldeInitialCaisse", "tauxTVA" FROM "Parametre";
DROP TABLE "Parametre";
ALTER TABLE "new_Parametre" RENAME TO "Parametre";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Devis_numero_key" ON "Devis"("numero");

-- CreateIndex
CREATE INDEX "Devis_clientId_idx" ON "Devis"("clientId");

-- CreateIndex
CREATE INDEX "Devis_date_idx" ON "Devis"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_numero_key" ON "Facture"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_devisId_key" ON "Facture"("devisId");

-- CreateIndex
CREATE INDEX "Facture_clientId_idx" ON "Facture"("clientId");

-- CreateIndex
CREATE INDEX "Facture_date_idx" ON "Facture"("date");

-- CreateIndex
CREATE INDEX "Facture_statut_idx" ON "Facture"("statut");
