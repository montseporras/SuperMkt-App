// Postgres local de desarrollo (sin Docker ni cuenta de Supabase).
// Uso: npm run db:dev  -> deja corriendo Postgres en el puerto 54329 y aplica las migraciones.
import { existsSync } from "node:fs";
import { join } from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import { migrate } from "./migrate";

const dataDir = join(process.cwd(), ".dev-db");
const port = 54329;
const url = `postgresql://postgres:postgres@localhost:${port}/postgres`;

const pg = new EmbeddedPostgres({ databaseDir: dataDir, user: "postgres", password: "postgres", port, persistent: true, initdbFlags: ["--encoding=UTF8", "--locale=C"] });

async function main() {
  if (!existsSync(join(dataDir, "PG_VERSION"))) await pg.initialise();
  await pg.start();
  await migrate(url);
  console.log(`
Postgres local listo.
DATABASE_URL=${url}
(Ctrl+C para detener)`);
}

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
