import { execSync } from "child_process";
import { mkdirSync } from "fs";
import { join } from "path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL manquant.");
  process.exit(1);
}

const backupDir = join(process.cwd(), "data", "backups");
mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
const dest = join(backupDir, `mega-${stamp}.sql`);

try {
  execSync(`pg_dump "${url}" --no-owner --no-acl -f "${dest}"`, {
    stdio: "inherit",
  });
  console.log("Sauvegarde créée :", dest);
} catch {
  console.error("Échec pg_dump. Vérifiez que PostgreSQL tourne et que pg_dump est installé.");
  process.exit(1);
}
