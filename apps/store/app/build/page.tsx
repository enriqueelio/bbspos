import { getCatalog } from "@/lib/catalog";
import { BuildClient } from "./build-client";

export const metadata = {
  title: "Arma tu boba — Bubble Drink",
};

export const dynamic = "force-dynamic";

export default async function BuildPage() {
  const catalog = await getCatalog();
  return <BuildClient catalog={catalog} />;
}
