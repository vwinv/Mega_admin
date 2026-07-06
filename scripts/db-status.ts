import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { Pool } from "pg";

const url = process.env.DATABASE_URL;

async function main() {
  if (!url) {
    console.error("DATABASE_URL manquant.");
    process.exit(1);
  }

  console.log("PostgreSQL :", url.replace(/:[^:@]+@/, ":****@"));

  const pool = new Pool({ connectionString: url });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

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
