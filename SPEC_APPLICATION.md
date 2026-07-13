# Cahier des charges — Application de Gestion Financière MEGA SN SARL

## Contexte
Application web de gestion financière pour une PME sénégalaise (devise : FCFA, aucune décimale).
Elle remplace un classeur Excel dont les données de départ sont fournies dans `donnees/mega_data.json`.
Comptabilité de trésorerie simple (entrées/sorties), plan comptable SYSCOHADA (OHADA), suivi
d'enveloppes budgétaires par personne/projet, et contrôles automatiques.

## Stack recommandée
- Next.js (App Router) + TypeScript + Tailwind CSS
- Base de données SQLite via Prisma (fichier local, simple à sauvegarder)
- Graphiques : Recharts
- Au premier lancement : script `seed` qui importe `donnees/mega_data.json`

## Modèle de données
- **Categorie** : nom, sens (`entree` | `sortie`), codeCompte (texte, ex. "601"), intituleCompte
- **CodeBudgetaire** : code (ex. "BUD-AMINA"), beneficiaire, enveloppe (int FCFA)
- **Operation** (journal banque/mobile money) : date, numeroPiece, libelle, categorieId,
  codeBudgetaireId (nullable), modePaiement (`Virement` | `Chèque` | `Carte bancaire` | `Mobile Money` | `Cash`),
  entree (int, nullable), sortie (int, nullable), observations
- **OperationCaisse** (espèces) : mêmes champs sans modePaiement
- **Parametre** : soldeInitialBanque, soldeInitialCaisse, plafondCaisse (300000),
  seuilDoubleValidation (500000), tauxTVA (0.18)
- **EcheanceImpot** : echeance (date), impot, periode, montantDu, datePaiement, statut
  (`Payé` | `En attente` | `En retard`), resteAPayer (calculé)
- Règle : une opération a SOIT une entrée SOIT une sortie, jamais les deux.
- Le code compte n'est jamais saisi : il découle de la catégorie choisie.

## Pages / fonctionnalités
1. **Tableau de bord** : solde banque, solde caisse, trésorerie totale, entrées/sorties de
   l'année, résultat, nombre d'alertes de contrôle. Graphiques : entrées vs sorties par mois,
   évolution de la trésorerie, enveloppe vs dépensé par code budgétaire.
2. **Journal** : liste filtrable (mois, catégorie, code budgétaire, mode, texte), ajout/édition/
   suppression d'opérations avec listes déroulantes. Le code compte s'affiche automatiquement.
3. **Petite caisse** : idem avec solde courant recalculé ligne à ligne
   (solde initial + cumul entrées − cumul sorties). Un solde négatif est bloqué à la saisie.
4. **Trésorerie** : tableau mensuel banque (début, entrées, sorties, fin), caisse idem,
   trésorerie totale. Tout est calculé, rien n'est saisi.
5. **Budget** : saisie du budget prévisionnel par catégorie × mois ; réalisé calculé depuis
   Journal + Caisse ; écarts (budget − réalisé) avec code couleur.
6. **Codes budgétaires (enveloppes/grants)** : CRUD des codes, saisie de l'enveloppe ; dépensé,
   reste et % consommé calculés ; barre de progression ; rouge si dépassement. Les catégories
   « Transfert vers petite caisse » et « Approvisionnement de caisse » sont exclues du dépensé
   (mouvements internes, code compte 585).
7. **Synthèse comptable** : totaux entrées/sorties/solde par code compte SYSCOHADA
   (agrégation Journal + Caisse) — exportable en CSV pour l'expert-comptable.
8. **Impôts & taxes** : référentiel fixe (TVA 18 %, retenues salaires, CFCE 3 %, IS 30 %, IMF,
   patente/CEL, IPRES, CSS), calculateur de TVA mensuelle (collectée − déductible − crédit
   reporté), échéancier avec statut et reste à payer.
9. **Contrôle financier** : les 13 contrôles automatiques ci-dessous, affichés OK/ALERTE avec
   recommandation ; rapprochement bancaire mensuel (saisie du solde du relevé, écart calculé) ;
   checklist mensuelle (11 tâches × 12 mois : Fait / À faire / N/A).

## Les 13 contrôles automatiques
1. Opérations sans date · 2. Opérations sans catégorie · 3. Opérations sans n° de pièce
(Journal + Caisse) · 4. Sorties sans code budgétaire (hors transferts internes) · 5. Lignes avec
entrée ET sortie · 6. Doublons potentiels (même date + libellé + montant) · 7. Solde de caisse
négatif · 8. Solde bancaire mensuel négatif · 9. Écart entre « Transfert vers petite caisse »
(Journal) et « Approvisionnement de caisse » (Caisse) · 10. Enveloppes budgétaires dépassées ·
11. Réalisé sorties > budget annuel · 12. Solde caisse > plafond autorisé · 13. Échéances
d'impôts « En retard ».

## Règles métier importantes
- Un paiement ≥ seuilDoubleValidation doit exiger un champ « validé par » avant enregistrement.
- Un transfert banque → caisse crée deux écritures liées (sortie Journal + entrée Caisse).
- Montants entiers en FCFA, format « 1 250 000 ».
- Interface entièrement en français.

## Étapes de réalisation suggérées (une par prompt)
1. Initialiser le projet, Prisma + schéma, script de seed depuis `donnees/mega_data.json`.
2. Journal + Petite caisse (CRUD complet avec validations).
3. Trésorerie + Tableau de bord avec graphiques.
4. Budget + Codes budgétaires.
5. Synthèse comptable + export CSV.
6. Impôts & taxes.
7. Contrôle financier (13 contrôles + rapprochement + checklist).
