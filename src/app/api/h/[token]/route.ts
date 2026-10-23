import { NextResponse } from "next/server";
import { mutationSchema } from "@/lib/schemas";
import { applyMutation, findHouseholdId, getSnapshot } from "@/server/repo";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET(_req: Request, ctx: RouteContext<"/api/h/[token]">) {
  const { token } = await ctx.params;
  try {
    const hid = await findHouseholdId(token);
    if (!hid) return NextResponse.json({ error: "Hogar no encontrado" }, { status: 404, headers: noStore });
    return NextResponse.json(await getSnapshot(hid), { headers: noStore });
  } catch (e) {
    console.error("snapshot", e);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500, headers: noStore });
  }
}

export async function POST(req: Request, ctx: RouteContext<"/api/h/[token]">) {
  const { token } = await ctx.params;
  const parsed = mutationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400, headers: noStore });
  }
  try {
    const hid = await findHouseholdId(token);
    if (!hid) return NextResponse.json({ error: "Hogar no encontrado" }, { status: 404, headers: noStore });
    await applyMutation(hid, parsed.data);
    return NextResponse.json(await getSnapshot(hid), { headers: noStore });
  } catch (e) {
    console.error("mutation", e);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500, headers: noStore });
  }
}
