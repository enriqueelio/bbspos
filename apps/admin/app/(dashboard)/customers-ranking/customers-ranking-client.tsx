"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from "@bbspos/ui";
import {
  BenefitMetric,
  BenefitMetricLabel,
  BenefitMetricList,
  LoyaltyPeriod,
  LoyaltyPeriodLabel,
  formatPrice,
  type BenefitMetric as BenefitMetricType,
  type CustomerBenefitRuleView,
  type CustomerRankingRow,
} from "@bbspos/types";
import {
  redeemCustomerPoints,
  saveBenefitRule,
} from "@/app/actions/loyalty";

interface Props {
  rows: CustomerRankingRow[];
  rules: CustomerBenefitRuleView[];
  period: string;
  search: string;
}

function errText(e: unknown): string {
  return e instanceof Error ? e.message : "No se pudo completar la acción.";
}

export function CustomersRankingClient({
  rows,
  rules,
  period,
  search,
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState(search);

  function goTo(periodo: string, text: string) {
    const params = new URLSearchParams();
    if (periodo !== LoyaltyPeriod.MONTH) params.set("period", periodo);
    const trimmed = text.trim().toUpperCase();
    if (trimmed) params.set("q", trimmed);
    const qs = params.toString();
    router.replace(`/customers-ranking${qs ? `?${qs}` : ""}`);
  }

  // Debounce del buscador: aplica la búsqueda 300 ms después de escribir.
  useEffect(() => {
    const timer = setTimeout(() => goTo(period, q), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // ===== Canje de puntos =====
  const [redeemFor, setRedeemFor] = useState<CustomerRankingRow | null>(null);
  const [redeemPoints, setRedeemPoints] = useState("");
  const [redeemDesc, setRedeemDesc] = useState("");
  const [redeemBusy, setRedeemBusy] = useState(false);

  async function handleRedeem() {
    if (!redeemFor) return;
    setRedeemBusy(true);
    try {
      await redeemCustomerPoints({
        customerId: redeemFor.customerId,
        points: Number(redeemPoints),
        description: redeemDesc,
      });
      toast({
        title: "Puntos canjeados",
        description: `Se descontaron ${redeemPoints} puntos de ${redeemFor.customerName}.`,
      });
      setRedeemFor(null);
      setRedeemPoints("");
      setRedeemDesc("");
      router.refresh();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "No se pudo canjear",
        description: errText(e),
      });
    } finally {
      setRedeemBusy(false);
    }
  }

  // ===== Reglas de lealtad =====
  const [editingRule, setEditingRule] =
    useState<CustomerBenefitRuleView | "new" | null>(null);
  const [ruleName, setRuleName] = useState("");
  const [ruleDesc, setRuleDesc] = useState("");
  const [ruleMetric, setRuleMetric] = useState<BenefitMetricType>(
    BenefitMetric.SPEND_MONTH,
  );
  const [ruleThreshold, setRuleThreshold] = useState("");
  const [ruleActive, setRuleActive] = useState(true);
  const [ruleBusy, setRuleBusy] = useState(false);

  function openRule(rule: CustomerBenefitRuleView | "new") {
    setEditingRule(rule);
    setRuleName(rule === "new" ? "" : rule.name);
    setRuleDesc(rule === "new" ? "" : rule.description);
    setRuleMetric(rule === "new" ? BenefitMetric.SPEND_MONTH : rule.metric);
    setRuleThreshold(rule === "new" ? "" : String(rule.threshold));
    setRuleActive(rule === "new" ? true : rule.active);
  }

  async function handleSaveRule() {
    if (!editingRule) return;
    setRuleBusy(true);
    try {
      await saveBenefitRule({
        ruleId: editingRule === "new" ? undefined : editingRule.id,
        name: ruleName,
        description: ruleDesc,
        metric: ruleMetric,
        threshold: Number(ruleThreshold),
        active: ruleActive,
      });
      toast({
        title: "Regla guardada",
        description: "La regla de lealtad se actualizó correctamente.",
      });
      setEditingRule(null);
      router.refresh();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "No se pudo guardar la regla",
        description: errText(e),
      });
    } finally {
      setRuleBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* ===== Ranking de clientes ===== */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Clientes frecuentes</h2>
            <p className="text-sm text-muted-foreground">
              Top 10 por gasto cobrado ({period === LoyaltyPeriod.MONTH ? "mes actual" : period === LoyaltyPeriod.DAYS_30 ? "últimos 30 días" : "histórico"}).
            </p>
          </div>
          <div className="flex items-center gap-2">
            {Object.values(LoyaltyPeriod).map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "outline"}
                size="sm"
                onClick={() => goTo(p, q)}
              >
                {LoyaltyPeriodLabel[p]}
              </Button>
            ))}
          </div>
        </div>

        <div className="mb-4 max-w-xs">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o teléfono…"
          />
        </div>

        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Sin clientes cobrados en este periodo.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2 text-right">Visitas (periodo)</th>
                  <th className="px-3 py-2 text-right">Gastado (periodo)</th>
                  <th className="px-3 py-2 text-right">Histórico</th>
                  <th className="px-3 py-2 text-right">Puntos</th>
                  <th className="px-3 py-2 text-right">Última visita</th>
                  <th className="px-3 py-2 text-right">Canjear</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.customerId}
                    className="border-t border-muted"
                  >
                    <td className="px-3 py-2 font-mono text-muted-foreground">
                      {i + 1}
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-semibold capitalize">{row.customerName}</p>
                      {row.phone && (
                        <p className="font-mono text-xs text-muted-foreground">
                          {row.phone}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">{row.periodVisits}</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {formatPrice(row.periodSpent)}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {row.totalVisits} visitas · {formatPrice(row.totalSpent)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Badge variant="secondary">{row.points} pts</Badge>
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {row.lastVisitAt
                        ? new Date(row.lastVisitAt).toLocaleDateString("es-BO")
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={row.points <= 0}
                        onClick={() => {
                          setRedeemFor(row);
                          setRedeemPoints("");
                          setRedeemDesc("");
                        }}
                      >
                        Canjear
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ===== Reglas de lealtad ===== */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Reglas de lealtad</h2>
            <p className="text-sm text-muted-foreground">
              Niveles por umbral: gasto del mes, visitas del mes o puntos acumulados.
            </p>
          </div>
          <Button size="sm" onClick={() => openRule("new")}>
            Nueva regla
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay reglas configuradas.
            </p>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-start justify-between gap-3 rounded-md border p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{rule.name}</p>
                  {rule.description && (
                    <p className="text-sm text-muted-foreground">
                      {rule.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {BenefitMetricLabel[rule.metric]} ≥ {rule.threshold}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge variant={rule.active ? "default" : "secondary"}>
                    {rule.active ? "Activa" : "Inactiva"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openRule(rule)}
                  >
                    Editar
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ===== Dialog de canje ===== */}
      <Dialog open={redeemFor !== null} onOpenChange={(o) => !o && setRedeemFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Canjear puntos</DialogTitle>
            <DialogDescription>
              {redeemFor?.customerName} tiene{" "}
              <span className="font-semibold">{redeemFor?.points ?? 0} puntos</span>.
              Los 1 Bs gastados suman 1 punto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="redeem-points">Puntos a canjear</Label>
              <Input
                id="redeem-points"
                type="number"
                min={1}
                max={redeemFor?.points ?? 0}
                value={redeemPoints}
                onChange={(e) => setRedeemPoints(e.target.value)}
                placeholder="Ej. 100"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="redeem-desc">Descripción (opcional)</Label>
              <Input
                id="redeem-desc"
                value={redeemDesc}
                onChange={(e) => setRedeemDesc(e.target.value)}
                placeholder="Ej. Bebida de cortesía"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRedeemFor(null)}
              disabled={redeemBusy}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRedeem}
              disabled={
                redeemBusy ||
                redeemFor === null ||
                !redeemPoints ||
                Number(redeemPoints) <= 0 ||
                Number(redeemPoints) > (redeemFor?.points ?? 0)
              }
            >
              {redeemBusy ? "Canjeando…" : "Canjear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog de regla ===== */}
      <Dialog
        open={editingRule !== null}
        onOpenChange={(o) => !o && setEditingRule(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRule === "new" ? "Nueva regla de lealtad" : "Editar regla"}
            </DialogTitle>
            <DialogDescription>
              Define el umbral que activa el nivel. Se aplica automáticamente al
              cajero y a los reportes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="rule-name">Nombre</Label>
              <Input
                id="rule-name"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="Ej. Cliente VIP"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rule-desc">Descripción (beneficio)</Label>
              <Input
                id="rule-desc"
                value={ruleDesc}
                onChange={(e) => setRuleDesc(e.target.value)}
                placeholder="Ej. Bebida grande gratis"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="rule-metric">Métrica</Label>
                <select
                  id="rule-metric"
                  value={ruleMetric}
                  onChange={(e) =>
                    setRuleMetric(e.target.value as BenefitMetricType)
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {BenefitMetricList.map((m) => (
                    <option key={m} value={m}>
                      {BenefitMetricLabel[m]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="rule-threshold">Umbral (mínimo)</Label>
                <Input
                  id="rule-threshold"
                  type="number"
                  min={1}
                  value={ruleThreshold}
                  onChange={(e) => setRuleThreshold(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="rule-active"
                type="checkbox"
                checked={ruleActive}
                onChange={(e) => setRuleActive(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="rule-active">Regla activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingRule(null)}
              disabled={ruleBusy}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveRule}
              disabled={
                ruleBusy ||
                !ruleName.trim() ||
                !ruleThreshold ||
                Number(ruleThreshold) <= 0
              }
            >
              {ruleBusy ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}