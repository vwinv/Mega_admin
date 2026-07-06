-- CreateTable
CREATE TABLE "TvaDeclaration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "annee" INTEGER NOT NULL,
    "mois" INTEGER NOT NULL,
    "collectee" INTEGER NOT NULL DEFAULT 0,
    "deductible" INTEGER NOT NULL DEFAULT 0,
    "creditReporte" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "TvaDeclaration_annee_mois_key" ON "TvaDeclaration"("annee", "mois");
