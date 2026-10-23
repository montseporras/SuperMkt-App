import { isValidToken } from "@/server/repo";

// Un manifiesto por hogar: al instalar la app en el celular, se abre directo en su lista.
export async function GET(_req: Request, ctx: RouteContext<"/h/[token]/manifest.webmanifest">) {
  const { token } = await ctx.params;
  if (!isValidToken(token)) return new Response("Not found", { status: 404 });
  const manifest = {
    name: "Compras de casa",
    short_name: "Compras",
    description: "La lista de compras compartida de tu hogar",
    lang: "es",
    start_url: `/h/${token}`,
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6fbf8",
    theme_color: "#2f7d5b",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(manifest), { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } });
}
