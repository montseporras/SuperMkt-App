import { ImageResponse } from "next/og";

const SIZES: Record<string, number> = { "180": 180, "192": 192, "512": 512, maskable: 512 };

export async function GET(_req: Request, ctx: RouteContext<"/icons/[size]">) {
  const { size: key } = await ctx.params;
  const size = SIZES[key];
  if (!size) return new Response("Not found", { status: 404 });
  // El ícono "maskable" deja un margen seguro del 20 % para que Android pueda recortarlo.
  const inner = key === "maskable" ? size * 0.56 : size * 0.7;
  const w = inner;
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#2f7d5b", borderRadius: key === "maskable" ? 0 : size * 0.22 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: w, height: w }}>
          <div style={{ width: w * 0.62, height: w * 0.24, border: `${w * 0.06}px solid white`, borderBottom: "none", borderRadius: `${w * 0.31}px ${w * 0.31}px 0 0`, transform: "scaleX(1)" }} />
          <div style={{ width: w, height: w * 0.66, background: "white", borderRadius: `${w * 0.05}px ${w * 0.05}px ${w * 0.16}px ${w * 0.16}px`, marginTop: -w * 0.01, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: w * 0.46, height: w * 0.24, borderLeft: `${w * 0.075}px solid #2f7d5b`, borderBottom: `${w * 0.075}px solid #2f7d5b`, transform: "rotate(-45deg) translateY(-8%)" }} />
          </div>
        </div>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=604800, immutable" } },
  );
}
