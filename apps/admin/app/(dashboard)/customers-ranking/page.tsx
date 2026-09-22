import {
  getCustomerRanking,
  listBenefitRules,
} from "@/app/actions/loyalty";
import { CustomersRankingClient } from "./customers-ranking-client";

export const metadata = { title: "Clientes frecuentes — BBSPOS Admin" };

export default async function CustomersRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; q?: string }>;
}) {
  const { period, q } = await searchParams;
  const [rows, rules] = await Promise.all([
    getCustomerRanking(period ?? "month", q),
    listBenefitRules(),
  ]);

  return (
    <CustomersRankingClient
      rows={rows}
      rules={rules}
      period={period ?? "month"}
      search={q ?? ""}
    />
  );
}