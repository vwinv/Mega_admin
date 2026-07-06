import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const url = process.env.DATABASE_URL ?? "file:./data/mega.db";

async function main() {
  if (!url.startsWith("file:")) {
    console.log("PostgreSQL détecté :", url.replace(/:[^:@]+@/, ":****@"));
    console.log("Utilisez psql ou un client SQL pour inspecter les tables.");
    return;
  }

  const adapter = new PrismaBetterSqlite3({ url });
  const db = new PrismaClient({ adapter });

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
  ]);

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║   MEGA SN SARL · État de la base         ║");
  console.log("╚══════════════════════════════════════════╝\n");
  console.log("Fichier :", url);
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
  console.log(`  Catégories        : ${categories}`);
  console.log(`  Codes budgétaires : ${codes}`);
  console.log(`  Journal (banque)  : ${journal}`);
  console.log(`  Petite caisse     : ${caisse}`);
  console.log(`  Lignes budget     : ${budget}`);
  console.log(`  Échéances impôts  : ${echeances}`);
  console.log(`  Déclarations TVA  : ${tva}`);
  console.log(`  Rapprochements    : ${rapprochements}`);
  console.log(`  Checklist         : ${checklist}`);
  console.log("");

  await db.$disconnect();
}

main().catch((e) => {
  console.error("Erreur connexion base :", e.message);
  console.error("\n→ Lancez : npm run db:setup");
  process.exit(1);
});
