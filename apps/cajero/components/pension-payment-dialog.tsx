"use client";

import { useMemo, useState } from "react";
import { Button } from "@bbspos/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@bbspos/ui";
import {
  PensionType,
  PensionTypeLabel,
  formatPrice,
  type PensionType as PensionTypeType,
} from "@bbspos/types";

export interface PensionCustomerOption {
  id: string;
  name: string;
  ci?: string | null;
  pensionType: PensionTypeType;
  balance: number;
  creditLimit: number;
}

interface PensionPaymentDialogProps {
  total: number;
  customers: PensionCustomerOption[];
  onConfirm: (customerId: string) => void;
  onCancel: () => void;
  busy?: boolean;
}

/** Diálogo de cobro por Cuenta Pensionado. Evalúa saldo (Prepago) o límite de
 *  deuda (Postpago) y bloquea el cobro si la cuenta no lo permite. */
export function PensionPaymentDialog({
  total,
  customers,
  onConfirm,
  onCancel,
  busy,
}: PensionPaymentDialogProps) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.ci?.toLowerCase().includes(q),
    );
  }, [customers, query]);

  const selected = customers.find((c) => c.id === selectedId) ?? null;

  const validation = useMemo(() => {
    if (!selected) return null;
    if (selected.pensionType === PensionType.PREPAGO) {
      if (selected.balance < total) {
        return {
          ok: false,
          message: `Saldo insuficiente: tiene ${formatPrice(selected.balance)} y el pedido cuesta ${formatPrice(total)}. Pide una recarga de ${formatPrice(total - selected.balance)} en Administración.`,
        };
      }
      return {
        ok: true,
        message: `Se descontará ${formatPrice(total)} del saldo y quedarán ${formatPrice(selected.balance - total)} a favor.`,
      };
    }
    const nextBalance = selected.balance - total;
    if (selected.creditLimit > 0 && nextBalance < -selected.creditLimit) {
      return {
        ok: false,
        message: `La deuda superaría el límite de ${formatPrice(selected.creditLimit)} (quedaría en ${formatPrice(Math.abs(nextBalance))}).`,
      };
    }
    if (nextBalance < 0) {
      return {
        ok: true,
        message: `Se acumulará una deuda de ${formatPrice(Math.abs(nextBalance))}.`,
      };
    }
    return {
      ok: true,
      message: `Tras el consumo quedará un saldo de ${formatPrice(nextBalance)}.`,
    };
  }, [selected, total]);

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cuenta Pensionado — {formatPrice(total)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedId(null);
            }}
            placeholder="Buscar cliente por nombre…"
            className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm focus:outline-none focus:border-primary"
          />

          <div className="max-h-48 space-y-1 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
                No hay clientes registrados. Créalos en Administración →
                Clientes / Pensionados.
              </p>
            )}
            {filtered.map((c) => {
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-accent"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{c.name}</span>
                    <span className="block text-xs text-white">
                      {PensionTypeLabel[c.pensionType]}
                      {c.pensionType === PensionType.POSTPAGO &&
                        c.creditLimit > 0 &&
                        ` · límite ${formatPrice(c.creditLimit)}`}
                    </span>
                  </span>
                  <span
                    className={`font-mono text-sm font-bold whitespace-nowrap ${
                      c.balance < 0 ? "text-red-500" : "text-emerald-400"
                    }`}
                  >
                    {c.balance < 0
                      ? `${formatPrice(Math.abs(c.balance))} de deuda`
                      : `${formatPrice(c.balance)} saldo`}
                  </span>
                </button>
              );
            })}
          </div>

          {selected && validation && (
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                validation.ok
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-red-500/40 bg-red-500/10 text-red-300"
              }`}
            >
              {validation.message}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button
            disabled={!selected || !validation?.ok || busy}
            onClick={() => selected && onConfirm(selected.id)}
          >
            {busy ? "Procesando…" : "Cobrar a cuenta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}