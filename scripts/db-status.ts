import "dotenv/config";
import { createSeedPrisma } from "../prisma/seed-prisma";

const url = process.env.DATABASE_URL ?? "";

async function main() {
  const db = createSeedPrisma();

  const [
    categories,
    codes,
    journal,
    caisse,
    budget,
    parametre,
    echeances,
    tva,
    rapprochements,
    checklist,
    users,
    clients,
    devis,
    factures,
  ] = await Promise.all([
    db.categorie.count(),
    db.codeBudgetaire.count(),
    db.operation.count(),
    db.operationCaisse.count(),
    db.budgetLigne.count(),
    db.parametre.findFirst(),
    db.echeanceImpot.count(),
    db.tvaDeclaration.count(),
    db.rapprochementBancaire.count(),
    db.checklistItem.count(),
    db.user.count(),
    db.clientFacturation.count(),
    db.devis.count(),
    db.facture.count(),
  ]);

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║   MEGA SN SARL · État de la base         ║");
  console.log("╚══════════════════════════════════════════╝\n");
  console.log("PostgreSQL :", url.replace(/:[^:@]+@/, ":****@"));
  console.log("");

  if (parametre) {
    console.log(`Entreprise  : ${parametre.entreprise}`);
    console.log(`Exercice    : ${parametre.annee}`);
    console.log(`Devise      : ${parametre.devise}`);
    console.log("");
  } else {
    console.log("⚠  Paramètres non initialisés. Lancez : npm run db:setup\n");
  }

  console.log("Tables :");
  console.log(`  Utilisateurs      : ${users}`);
  console.log(`  Catégories        : ${categories}`);
  console.log(`  Codes budgétaires : ${codes}`);
  console.log(`  Journal (banque)  : ${journal}`);
  console.log(`  Petite caisse     : ${caisse}`);
  console.log(`  Lignes budget     : ${budget}`);
  console.log(`  Clients facture   : ${clients}`);
  console.log(`  Devis             : ${devis}`);
  console.log(`  Factures          : ${factures}`);
  console.log(`  Échéances impôts  : ${echeances}`);
  console.log(`  Déclarations TVA  : ${tva}`);
  console.log(`  Rapprochements    : ${rapprochements}`);
  console.log(`  Checklist         : ${checklist}`);
  console.log("");

  await db.$disconnect();
}

main().catch((e) => {
  console.error("Erreur connexion base :", e.message);
  console.error("\n→ Lancez : docker compose up -d && npm run db:setup");
  process.exit(1);
});
