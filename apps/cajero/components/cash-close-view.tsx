"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cva } from "class-variance-authority";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Divide,
  Printer,
  QrCode,
  Users,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  cn,
} from "@bbspos/ui";
import {
  formatPrice,
  type CashCloseRecord,
  type CashCloseStats,
} from "@bbspos/types";
import { confirmCashClose, printCashClose } from "@/app/actions/cash-close";

function DiffBadge({ diff }: { diff: number }) {
  if (diff === 0) {
    return (
      <Badge className="bg-emerald-600 text-white">Cuadrado</Badge>
    );
  }
  return (
    <Badge
      className={diff > 0 ? "bg-amber-500 text-black" : "bg-red-600 text-white"}
    >
      {diff > 0 ? `+${formatPrice(diff)}` : formatPrice(diff)}
    </Badge>
  );
}

// Formatea "X Bs": sin decimales cuando es entero y con 2 decimales cuando
// intervienen monedas de 0,50 Bs (p. ej. 1.50 Bs).
function fmtBs(n: number): string {
  return Number.isInteger(n) ? `${n} Bs` : `${n.toFixed(2)} Bs`;
}

interface Denomination {
  valor: number;
  tipo: "BILLETE" | "MONEDA";
}

const DENOMINACIONES: Denomination[] = [
  { valor: 200, tipo: "BILLETE" },
  { valor: 100, tipo: "BILLETE" },
  { valor: 50, tipo: "BILLETE" },
  { valor: 20, tipo: "BILLETE" },
  { valor: 10, tipo: "BILLETE" },
  { valor: 5, tipo: "MONEDA" },
  { valor: 2, tipo: "MONEDA" },
  { valor: 1, tipo: "MONEDA" },
  { valor: 0.5, tipo: "MONEDA" },
];

// Rayado cebra de la grilla: filas pares con fondo, impares transparentes.
const arqueoRow = cva("border-b border-slate-800/70 transition-colors", {
  variants: {
    zebra: {
      par: "bg-slate-900/40",
      impar: "bg-transparent",
    },
  },
});

export function CashCloseView({
  stats,
  closes,
  canClose,
}: {
  stats: CashCloseStats;
  closes: CashCloseRecord[];
  canClose: boolean;
}) {
  const router = useRouter();
  const [conteo, setConteo] = useState<Record<number, number>>({});
  const [active, setActive] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [printClose, setPrintClose] = useState(true);
  const [pending, startTransition] = useTransition();
  const [busyPrintId, setBusyPrintId] = useState<string | null>(null);
  const [result, setResult] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const countedCash = DENOMINACIONES.reduce(
    (sum, d) => sum + d.valor * (conteo[d.valor] ?? 0),
    0,
  );
  const diffCash = countedCash - stats.expectedCash;

  function onKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    const refs = inputRefs.current;
    if (e.key === "ArrowDown" || e.key === "Enter") {
      e.preventDefault();
      if (index + 1 < refs.length) refs[index + 1]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (index - 1 >= 0) refs[index - 1]?.focus();
    }
  }

  function onConfirm() {
    setResult(null);
    startTransition(async () => {
      try {
        const denominations = DENOMINACIONES.map((d) => ({
          value: d.valor,
          count: conteo[d.valor] ?? 0,
        }));
        const res = await confirmCashClose({
          denominations,
          notes: notes.trim() || undefined,
        });
        setResult({ ok: true, text: res.message });
        router.refresh();
        if (printClose) {
          await printCashClose(res.id);
        }
      } catch (e) {
        setResult({
          ok: false,
          text: e instanceof Error ? e.message : "No se pudo guardar el cierre.",
        });
      }
    });
  }

  async function onReprint(id: string) {
    setBusyPrintId(id);
    try {
      await printCashClose(id);
    } catch (e) {
      setResult({
        ok: false,
        text: e instanceof Error ? e.message : "No se pudo imprimir.",
      });
    } finally {
      setBusyPrintId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-5 w-5 text-emerald-400" />
            Arqueo de billetes (gaveta)
          </CardTitle>
          <p className="text-sm text-white">
            Ingresa cuántos de cada denominación hay físicamente en la caja.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-slate-700">
            <div className="max-h-[52vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-950 text-[10px] uppercase tracking-wide text-slate-400">
                  <tr className="border-b border-slate-700">
                    <th className="px-4 py-2 text-left font-semibold">
                      Denominación
                    </th>
                    <th className="w-24 px-2 py-2 text-center font-semibold">
                      Cantidad
                    </th>
                    <th className="px-4 py-2 text-right font-semibold">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {DENOMINACIONES.map((d, i) => {
                    const count = conteo[d.valor] ?? 0;
                    const activa = active === d.valor;
                    return (
                      <tr
                        key={d.valor}
                        className={cn(
                          arqueoRow({ zebra: i % 2 === 1 ? "par" : "impar" }),
                          activa && "hover:bg-slate-800/60",
                          count > 0 ? "text-emerald-400" : "text-white",
                        )}
                      >
                        <td className="px-4 py-1.5">
                          <span className="font-black">
                            Bs {d.valor}
                          </span>
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-slate-400">
                            {d.tipo}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <Input
                            ref={(el) => {
                              inputRefs.current[i] = el;
                            }}
                            inputMode="numeric"
                            min={0}
                            autoComplete="off"
                            value={count === 0 ? "" : String(count)}
                            onChange={(e) => {
                              setResult(null);
                              const digits = e.target.value
                                .replace(/[^\d]/g, "")
                                .slice(0, 4);
                              setConteo((prev) => ({
                                ...prev,
                                [d.valor]: digits === "" ? 0 : parseInt(digits, 10),
                              }));
                            }}
                            onFocus={(e) => {
                              setActive(d.valor);
                              e.currentTarget.select();
                            }}
                            onKeyDown={(e) => onKeyDown(e, i)}
                            placeholder="0"
                            className="h-9 w-20 text-center tabular-nums"
                            aria-label={`Cantidad de ${d.valor} bolivianos`}
                          />
                        </td>
                        <td className="px-4 py-1.5 text-right font-semibold tabular-nums">
                          {fmtBs(d.valor * count)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="sticky bottom-0 z-10 bg-slate-950">
                  <tr className="border-t border-emerald-500/30">
                    <td className="px-4 py-3 font-black uppercase tracking-wide text-emerald-300">
                      Total General
                    </td>
                    <td></td>
                    <td className="px-4 py-3 text-right text-3xl font-black tabular-nums text-emerald-300">
                      {fmtBs(countedCash)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Tip: escribe la cantidad y pulsa ↓ o Enter para pasar a la siguiente
            denominación.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Resumen y contraste del día ({stats.date})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid gap-2 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-700 p-3">
              <p className="text-sm font-bold text-white">
                Efectivo — Sistema vs. contado
              </p>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-white">
                    Esperado en gaveta (sistema)
                  </span>
                  <span className="tabular-nums font-semibold text-white">
                    {formatPrice(stats.expectedCash)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="pl-4 text-xs text-slate-400">
                    Ventas efectivo
                  </span>
                  <span className="tabular-nums text-slate-300">
                    {formatPrice(stats.systemCash)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="pl-4 text-xs text-slate-400">
                    Recargas de pensionados (efectivo)
                  </span>
                  <span className="tabular-nums text-slate-300">
                    {formatPrice(stats.rechargeCash)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1">
                  <span className="text-white">Contado en gaveta</span>
                  <span className="tabular-nums font-black text-emerald-300">
                    {formatPrice(countedCash)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-white">Sobrante / faltante</span>
                  <DiffBadge diff={diffCash} />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-700 p-3">
              <p className="text-sm font-bold text-white">
                QR — validar contra el banco
              </p>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="flex items-center gap-1 text-white">
                    <QrCode className="h-4 w-4" /> Ventas por QR
                  </span>
                  <span className="tabular-nums font-semibold text-white">
                    {formatPrice(stats.systemQr)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="pl-5 text-xs text-slate-400">
                    Recargas de pensionados (QR)
                  </span>
                  <span className="tabular-nums text-slate-300">
                    {formatPrice(stats.rechargeQr)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1">
                  <span className="text-white">Total QR esperado</span>
                  <span className="tabular-nums font-black text-white">
                    {formatPrice(stats.systemQr + stats.rechargeQr)}
                  </span>
                </div>
              </div>
              {stats.systemCard > 0 && (
                <p className="mt-3 border-t border-slate-800 pt-2 text-sm">
                  <span className="text-white">Tarjeta (sistema):</span>{" "}
                  <span className="tabular-nums font-semibold text-white">
                    {formatPrice(stats.systemCard)}
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-700 p-3">
            <p className="flex items-center gap-1 text-sm font-bold text-white">
              <Users className="h-4 w-4" /> Pensionados
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-400">
                  Consumos por cuenta (no entran a la caja)
                </p>
                <p className="text-xl font-black tabular-nums text-white">
                  {formatPrice(stats.pensionSales)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Recargas en efectivo</p>
                <p className="text-xl font-black tabular-nums text-emerald-300">
                  {formatPrice(stats.rechargeCash)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Recargas en QR</p>
                <p className="text-xl font-black tabular-nums text-white">
                  {formatPrice(stats.rechargeQr)}
                </p>
              </div>
            </div>
            {stats.splitOrders > 0 && (
              <p className="mt-3 flex items-center gap-1 border-t border-slate-800 pt-2 text-sm text-slate-300">
                <Divide className="h-4 w-4" />
                {stats.splitOrders} pedido
                {stats.splitOrders !== 1 ? "s" : ""} con pago dividido
                (efectivo/QR) — los montos ya están prorrateados en el resumen.
              </p>
            )}
            {stats.deliveredOrders > 0 && (
              <p className="mt-1 text-xs text-slate-400">
                Pedidos entregados hoy: {stats.deliveredOrders}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Confirmar cierre de caja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-white">
              Nota (opcional)
            </span>
            <Input
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setResult(null);
              }}
              placeholder="Incidencias del turno, sobrantes explicados, etc."
              className="w-full"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-white">
            <input
              type="checkbox"
              checked={printClose}
              onChange={(e) => setPrintClose(e.target.checked)}
              className="h-4 w-4"
            />
            Imprimir ticket resumen al confirmar
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              disabled={pending || !canClose}
              onClick={onConfirm}
              title={canClose ? undefined : "Solo el cajero o el administrador"}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {pending ? "Guardando…" : "Confirmar Cierre de Caja"}
            </Button>
            {!canClose && (
              <span className="text-sm text-slate-400">
                Solo un cajero o administrador puede confirmar el cierre.
              </span>
            )}
          </div>
          {result && (
            <p
              className={cn(
                "rounded-md px-3 py-2 text-sm font-semibold",
                result.ok
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-red-500/10 text-red-400",
              )}
            >
              {result.ok && <CheckCircle2 className="mr-1 inline h-4 w-4" />}
              {!result.ok && <AlertTriangle className="mr-1 inline h-4 w-4" />}
              {result.text}
            </p>
          )}
        </CardContent>
      </Card>

      {closes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Cierres de hoy ({closes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {closes.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-700 px-3 py-2"
              >
                <span className="shrink-0 tabular-nums text-white">
                  {new Date(c.closedAt).toLocaleTimeString("es-BO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="font-semibold text-primary">{c.userName}</span>
                <span className="text-sm text-slate-300">
                  Contado: {formatPrice(c.countedCash)}
                </span>
                <span className="text-sm text-slate-300">
                  Esperado: {formatPrice(c.expectedCash)}
                </span>
                <DiffBadge diff={c.diffCash} />
                {c.notes && (
                  <span className="w-full text-xs text-slate-400">
                    Nota: {c.notes}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  disabled={busyPrintId === c.id}
                  onClick={() => onReprint(c.id)}
                >
                  {busyPrintId === c.id ? (
                    "Imprimiendo…"
                  ) : (
                    <>
                      <Printer className="mr-1 h-4 w-4" /> Reimprimir
                    </>
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}