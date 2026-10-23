import type { Metadata } from "next";
import { HouseholdApp } from "@/components/household-app";

export async function generateMetadata({ params }: PageProps<"/h/[token]">): Promise<Metadata> {
  const { token } = await params;
  return { title: "Compras de casa", manifest: `/h/${token}/manifest.webmanifest` };
}

export default async function HouseholdPage({ params }: PageProps<"/h/[token]">) {
  const { token } = await params;
  return <HouseholdApp token={token} />;
}
