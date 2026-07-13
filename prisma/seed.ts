import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { importMegaData } from "../src/lib/import-data";
import type { MegaData } from "../src/lib/import-types";
import { createSeedPrisma } from "./seed-prisma";
import { seedUsers } from "./seed-users";

const prisma = createSeedPrisma();

async function main() {
  const dataPath = join(process.cwd(), "donnees", "mega_data.json");
  const raw = readFileSync(dataPath, "utf-8");
  const data: MegaData = JSON.parse(raw);

  const result = await importMegaData(data, { replace: true }, prisma);
  console.log("Import terminé :", result);

  await seedUsers(prisma);
  console.log("Utilisateurs initialisés.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
