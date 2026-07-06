import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const url = process.env.DATABASE_URL ?? "file:./data/mega.db";

if (!url.startsWith("file:")) {
  console.error("Sauvegarde automatique disponible uniquement pour SQLite.");
  process.exit(1);
}

const dbPath = url.replace("file:", "").replace(/^\.\//, "");
const src = join(process.cwd(), dbPath);

if (!existsSync(src)) {
  console.error("Base introuvable :", src);
  console.error("Lancez d'abord : npm run db:setup");
  process.exit(1);
}

const backupDir = join(process.cwd(), "data", "backups");
mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
const dest = join(backupDir, `mega-${stamp}.db`);

copyFileSync(src, dest);
console.log("Sauvegarde créée :", dest);
