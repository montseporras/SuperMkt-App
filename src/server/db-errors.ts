import "server-only";

/** Traduce un error de la base a una pista en español para quien configura la app (sin datos sensibles). */
export function describeDbError(e: unknown): { code: string; hint: string } {
  const err = e as { code?: string; message?: string; errno?: string };
  const code = String(err?.code ?? err?.errno ?? "");
  const msg = String(err?.message ?? "");

  if (/DATABASE_URL/.test(msg)) return { code: "NO_DATABASE_URL", hint: "Falta la variable DATABASE_URL en Vercel (Settings → Environment Variables) y volver a desplegar." };
  if (code === "28P01" || code === "28000" || /password authentication|Tenant or user not found/i.test(msg))
    return { code: "AUTH", hint: "Usuario o contraseña de la base incorrectos. Copiá de nuevo la cadena del Transaction pooler." };
  if (code === "42P01" || code === "42703") return { code: "MIGRATIONS", hint: "Faltan tablas o columnas: ejecutá las 4 migraciones de supabase/migrations en el SQL Editor, en orden." };
  if (["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ETIMEDOUT", "CONNECT_TIMEOUT", "ECONNRESET"].includes(code) || /ENOTFOUND|ECONNREFUSED|timeout/i.test(msg))
    return { code: "CONNECTION", hint: "No se pudo conectar a la base. Revisá que la dirección sea la del Transaction pooler (…pooler.supabase.com:6543)." };
  if (/Invalid URL|invalid connection string|URL/i.test(msg)) return { code: "BAD_URL", hint: "La cadena DATABASE_URL está mal escrita. Si la contraseña tiene @ # / o :, codificalos (%40 %23 %2F %3A) o cambiá la contraseña." };
  return { code: code || "UNKNOWN", hint: "Error inesperado de la base. Mirá los Logs de Vercel." };
}
