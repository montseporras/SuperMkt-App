import "server-only";
import postgres from "postgres";

const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

/**
 * Conexión SQL directa a Postgres (Supabase). Usá la cadena del "Transaction pooler"
 * (puerto 6543) en producción serverless: `prepare: false` es obligatorio en ese modo.
 */
export function sql(): postgres.Sql {
  if (!globalForDb.sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Falta la variable de entorno DATABASE_URL");
    globalForDb.sql = postgres(url, {
      prepare: false,
      max: 5,
      idle_timeout: 20,
      ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require",
    });
  }
  return globalForDb.sql;
}
