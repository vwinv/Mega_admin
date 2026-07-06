import "dotenv/config";
import { createSeedPrisma } from "../prisma/seed-prisma";
import { seedUsers } from "../prisma/seed-users";

const prisma = createSeedPrisma();

seedUsers(prisma)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
