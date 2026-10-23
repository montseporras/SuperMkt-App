import { NextResponse } from "next/server";
import { createHouseholdSchema } from "@/lib/schemas";
import { createHousehold } from "@/server/repo";

export const dynamic = "force-dynamic";

// Límite simple por IP (best-effort: en serverless cada instancia lleva su propio contador).
const hits = new Map<string, number[]>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 10;

function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) {
    return NextResponse.json({ error: "Demasiados intentos. Probá de nuevo más tarde." }, { status: 429 });
  }
  const parsed = createHouseholdSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
  try {
    const token = await createHousehold(parsed.data.name);
    return NextResponse.json({ token }, { status: 201 });
  } catch (e) {
    console.error("createHousehold", e);
    return NextResponse.json({ error: "No se pudo crear el hogar" }, { status: 500 });
  }
}
