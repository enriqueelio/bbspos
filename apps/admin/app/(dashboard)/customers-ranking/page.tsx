import {
  getCustomerRanking,
  listBenefitRules,
} from "@/app/actions/loyalty";
import { CustomersRankingClient } from "./customers-ranking-client";

export const metadata = { title: "Clientes frecuentes — BBSPOS Admin" };

export default async function CustomersRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; q?: string; sortBy?: string }>;
}) {
  const { period, q, sortBy } = await searchParams;
  const [rows, rules] = await Promise.all([
    getCustomerRanking(period ?? "month", q, sortBy as "gasto" | "visitas" | undefined),
    listBenefitRules(),
  ]);

  return (
    <CustomersRankingClient
      rows={rows}
      rules={rules}
      period={period ?? "month"}
      search={q ?? ""}
      sortBy={sortBy ?? "gasto"}
    />
  );
}