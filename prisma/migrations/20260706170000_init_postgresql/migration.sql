-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CEO', 'COMPTABLE', 'VALIDATEUR', 'LECTURE_SEULE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "identifiant" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT,
    "googleId" TEXT,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'COMPTABLE',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categorie" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "sens" TEXT NOT NULL,
    "codeCompte" TEXT NOT NULL,
    "intituleCompte" TEXT NOT NULL,

    CONSTRAINT "Categorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeBudgetaire" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "beneficiaire" TEXT NOT NULL,
    "enveloppe" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CodeBudgetaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operation" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3),
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
    "demandeAt" TIMESTAMP(3),
    "approuvePar" TEXT,
    "approuveAt" TIMESTAMP(3),
    "motifRefus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationCaisse" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3),
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
    "demandeAt" TIMESTAMP(3),
    "approuvePar" TEXT,
    "approuveAt" TIMESTAMP(3),
    "motifRefus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationCaisse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parametre" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "entreprise" TEXT NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'FCFA',
    "annee" INTEGER NOT NULL,
    "soldeInitialBanque" INTEGER NOT NULL,
    "soldeInitialCaisse" INTEGER NOT NULL,
    "plafondCaisse" INTEGER NOT NULL DEFAULT 300000,
    "seuilDoubleValidation" INTEGER NOT NULL DEFAULT 500000,
    "tauxTVA" DOUBLE PRECISION NOT NULL DEFAULT 0.18,
    "emailContact" TEXT NOT NULL DEFAULT 'contact@mega-sn.com',
    "telephoneContact" TEXT NOT NULL DEFAULT '78 450 40 52',

    CONSTRAINT "Parametre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientFacturation" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "adresse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientFacturation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Devis" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevisLigne" (
    "id" TEXT NOT NULL,
    "devisId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "designation" TEXT NOT NULL,
    "details" TEXT,
    "duree" TEXT,
    "prix" INTEGER NOT NULL,
    "styleAccent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DevisLigne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "titre" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "devisId" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "reliquat" INTEGER NOT NULL DEFAULT 0,
    "reliquatLabel" TEXT NOT NULL DEFAULT 'Reliquat',
    "tauxTVA" DOUBLE PRECISION NOT NULL DEFAULT 0.18,
    "montantPaye" INTEGER NOT NULL DEFAULT 0,
    "datePaiement" TIMESTAMP(3),
    "operationId" TEXT,
    "statutApprobation" TEXT NOT NULL DEFAULT 'APPROUVE',
    "demandePar" TEXT,
    "demandeAt" TIMESTAMP(3),
    "approuvePar" TEXT,
    "approuveAt" TIMESTAMP(3),
    "motifRefus" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactureLigne" (
    "id" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "designation" TEXT NOT NULL,
    "details" TEXT,
    "prix" INTEGER NOT NULL,
    "styleAccent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FactureLigne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EcheanceImpot" (
    "id" TEXT NOT NULL,
    "echeance" TIMESTAMP(3) NOT NULL,
    "impot" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "montantDu" INTEGER NOT NULL,
    "datePaiement" TIMESTAMP(3),
    "statut" TEXT NOT NULL,

    CONSTRAINT "EcheanceImpot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetLigne" (
    "id" TEXT NOT NULL,
    "categorieId" TEXT NOT NULL,
    "mois" INTEGER NOT NULL,
    "montant" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BudgetLigne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RapprochementBancaire" (
    "id" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "mois" INTEGER NOT NULL,
    "soldeReleve" INTEGER NOT NULL,

    CONSTRAINT "RapprochementBancaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "mois" INTEGER NOT NULL,
    "tacheId" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'À faire',

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TvaDeclaration" (
    "id" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "mois" INTEGER NOT NULL,
    "collectee" INTEGER NOT NULL DEFAULT 0,
    "deductible" INTEGER NOT NULL DEFAULT 0,
    "creditReporte" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TvaDeclaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userNom" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_identifiant_key" ON "User"("identifiant");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "Categorie_nom_key" ON "Categorie"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "CodeBudgetaire_code_key" ON "CodeBudgetaire"("code");

-- CreateIndex
CREATE INDEX "Operation_date_idx" ON "Operation"("date");

-- CreateIndex
CREATE INDEX "Operation_categorieId_idx" ON "Operation"("categorieId");

-- CreateIndex
CREATE INDEX "Operation_statutApprobation_idx" ON "Operation"("statutApprobation");

-- CreateIndex
CREATE INDEX "OperationCaisse_date_idx" ON "OperationCaisse"("date");

-- CreateIndex
CREATE INDEX "OperationCaisse_categorieId_idx" ON "OperationCaisse"("categorieId");

-- CreateIndex
CREATE INDEX "OperationCaisse_statutApprobation_idx" ON "OperationCaisse"("statutApprobation");

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

-- CreateIndex
CREATE INDEX "Facture_statutApprobation_idx" ON "Facture"("statutApprobation");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetLigne_categorieId_mois_key" ON "BudgetLigne"("categorieId", "mois");

-- CreateIndex
CREATE UNIQUE INDEX "RapprochementBancaire_annee_mois_key" ON "RapprochementBancaire"("annee", "mois");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistItem_annee_mois_tacheId_key" ON "ChecklistItem"("annee", "mois", "tacheId");

-- CreateIndex
CREATE UNIQUE INDEX "TvaDeclaration_annee_mois_key" ON "TvaDeclaration"("annee", "mois");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- AddForeignKey
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_codeBudgetaireId_fkey" FOREIGN KEY ("codeBudgetaireId") REFERENCES "CodeBudgetaire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationCaisse" ADD CONSTRAINT "OperationCaisse_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationCaisse" ADD CONSTRAINT "OperationCaisse_codeBudgetaireId_fkey" FOREIGN KEY ("codeBudgetaireId") REFERENCES "CodeBudgetaire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devis" ADD CONSTRAINT "Devis_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientFacturation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevisLigne" ADD CONSTRAINT "DevisLigne_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientFacturation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactureLigne" ADD CONSTRAINT "FactureLigne_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLigne" ADD CONSTRAINT "BudgetLigne_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
