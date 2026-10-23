import { NextResponse } from "next/server";
import { sql } from "@/server/db";
import { describeDbError } from "@/server/db-errors";

export const dynamic = "force-dynamic";

const REQUIRED = ["households", "products", "list_items", "categories"];

/** Diagnóstico de la instalación: no expone contraseñas ni datos de ningún hogar. */
export async function GET() {
  try {
    const db = sql();
    const rows = await db`select table_name from information_schema.tables where table_schema = 'public'`;
    const present = new Set(rows.map((r) => r.table_name as string));
    const missingTables = REQUIRED.filter((t) => !present.has(t));
    const cols = await db`select column_name from information_schema.columns where table_name = 'list_items'`;
    const hasAuthors = cols.some((c) => c.column_name === "added_by");
    const ok = missingTables.length === 0 && hasAuthors;
    return NextResponse.json(
      {
        ok,
        database: "conectada",
        missingTables,
        migrationsHint: ok ? null : "Ejecutá las 4 migraciones de supabase/migrations en el SQL Editor, en orden (0001 a 0004).",
      },
      { status: ok ? 200 : 503 },
    );
  } catch (e) {
    const { code, hint } = describeDbError(e);
    return NextResponse.json({ ok: false, database: "sin conexión", code, hint }, { status: 503 });
  }
}
