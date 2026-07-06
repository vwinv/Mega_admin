import type { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth";

const DEFAULT_USERS = [
  {
    identifiant: "admin",
    nom: "Administrateur",
    email: "admin@mega-sn.com",
    password: "Admin@2026",
    role: "ADMIN" as const,
  },
  {
    identifiant: "ceo",
    nom: "Directrice générale (CEO)",
    email: "ceo@mega-sn.com",
    password: "Ceo@2026",
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

export async function seedUsers(prisma: PrismaClient) {
  const count = await prisma.user.count();
  if (count > 0) {
    const ceo = await prisma.user.findUnique({ where: { identifiant: "ceo" } });
    if (!ceo) {
      await prisma.user.create({
        data: {
          identifiant: "ceo",
          nom: "Directrice générale (CEO)",
          email: null,
          passwordHash: await hashPassword(
            process.env.CEO_PASSWORD ?? "Ceo@2026"
          ),
          role: "CEO",
        },
      });
      console.log("  Utilisateur CEO ajouté (comptes existants).");
    } else {
      console.log("Utilisateurs déjà présents, seed users ignoré.");
    }
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD ?? DEFAULT_USERS[0].password;
  const adminIdentifiant =
    process.env.ADMIN_IDENTIFIANT ?? DEFAULT_USERS[0].identifiant;

  for (const u of DEFAULT_USERS) {
    let password = u.password;
    if (u.identifiant === "admin" && process.env.ADMIN_PASSWORD) {
      password = adminPassword;
    }
    if (u.identifiant === "ceo" && process.env.CEO_PASSWORD) {
      password = process.env.CEO_PASSWORD;
    }
    const identifiant =
      u.identifiant === "admin" ? adminIdentifiant : u.identifiant;

    await prisma.user.create({
      data: {
        identifiant,
        nom: u.nom,
        email: u.email,
        passwordHash: await hashPassword(password),
        role: u.role,
      },
    });
    console.log(`  Utilisateur créé : ${identifiant} (${u.role})`);
  }
}
