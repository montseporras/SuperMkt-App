import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Landing } from "@/components/landing";
import { isValidToken } from "@/server/repo";

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  // Este dispositivo ya usó un hogar: se abre directo, sin pedir nada (salvo que se pida uno nuevo con ?nuevo).
  const last = (await cookies()).get("cdc_last")?.value;
  if (last && isValidToken(last) && sp.nuevo === undefined) redirect(`/h/${last}`);
  return <Landing />;
}
