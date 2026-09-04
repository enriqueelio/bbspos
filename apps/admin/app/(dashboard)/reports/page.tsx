import { ReportsClient } from "./reports-client";

export const metadata = {
  title: "Reportes — BBSPOS Admin",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string }>;
}) {
  const { report } = await searchParams;
  return <ReportsClient initialReport={report} />;
}
