// Aplica supabase/migrations/*.sql sobre DATABASE_URL (idempotente: usa "if not exists").
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

export async function migrate(url: string) {
  const db = postgres(url, { max: 1, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require" });
  const dir = join(process.cwd(), "supabase", "migrations");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.unsafe(readFileSync(join(dir, f), "utf8"));
    console.log("✔ migración aplicada:", f);
  }
  await db.end();
}

if (process.argv[1]?.endsWith("migrate.ts")) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Definí DATABASE_URL (ver .env.example).");
    process.exit(1);
  }
  migrate(url).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
