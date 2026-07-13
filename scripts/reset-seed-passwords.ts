/**
 * Force-reset des mots de passe seed (utile si les comptes existent déjà).
 * Usage : npx tsx scripts/reset-seed-passwords.ts
 */
import "dotenv/config";
import { createSeedPrisma } from "../prisma/seed-prisma";
import { hashPassword } from "../src/lib/auth";

const USERS = [
  {
    identifiant: "admin",
    nom: "Administrateur",
    email: "admin@mega-sn.com",
    password: process.env.ADMIN_PASSWORD ?? "Admin@2026",
    role: "ADMIN" as const,
  },
  {
    identifiant: "ceo",
    nom: "Directrice générale (CEO)",
    email: "ceo@mega-sn.com",
    password: process.env.CEO_PASSWORD ?? "Ceo@2026",
    role: "CEO" as const,
  },
  {
    identifiant: "comptable",
    nom: "Comptable",
    email: "comptable@mega-sn.com",
    password: "Compta@2026",
    role: "COMPTABLE" as const,
  },
  {
    identifiant: "validateur",
    nom: "Validateur",
    email: "validateur@mega-sn.com",
    password: "Valid@2026",
    role: "VALIDATEUR" as const,
  },
  {
    identifiant: "lecture",
    nom: "Consultation",
    email: "lecture@mega-sn.com",
    password: "Lecture@2026",
    role: "LECTURE_SEULE" as const,
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL manquant");
  }

  const prisma = createSeedPrisma();
  console.log("Connexion base…");

  for (const u of USERS) {
    const hash = await hashPassword(u.password);
    const user = await prisma.user.upsert({
      where: { identifiant: u.identifiant },
      create: {
        identifiant: u.identifiant,
        nom: u.nom,
        email: u.email,
        passwordHash: hash,
        role: u.role,
        actif: true,
      },
      update: {
        passwordHash: hash,
        email: u.email,
        nom: u.nom,
        role: u.role,
        actif: true,
      },
    });
    console.log(`OK  ${user.identifiant}  (${user.role})  →  ${u.password}`);
  }

  await prisma.$disconnect();
  console.log("\nMot de passe réinitialisés. Connectez-vous avec l'identifiant (ex. admin), pas l'e-mail.");
}

main().catch(async (e) => {
  console.error("Échec :", e.message ?? e);
  process.exit(1);
});
