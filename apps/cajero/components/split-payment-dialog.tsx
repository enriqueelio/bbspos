"use client";

import { useState, useMemo } from "react";
import { Button } from "@bubba/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@bubba/ui";
import {
  PaymentMethod,
  PaymentMethodLabel,
  formatPrice,
} from "@bubba/types";

interface SplitPaymentDialogProps {
  total: number;
  onConfirm: (method: string, method2: string, amount2: number) => void;
  onCancel: () => void;
  busy?: boolean;
}

const METHODS = [PaymentMethod.EFECTIVO, PaymentMethod.QR] as const;

export function SplitPaymentDialog({
  total,
  onConfirm,
  onCancel,
  busy,
}: SplitPaymentDialogProps) {
  const [method1, setMethod1] = useState<PaymentMethod>(PaymentMethod.EFECTIVO);
  const [amount1, setAmount1] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const method2 = method1 === PaymentMethod.EFECTIVO ? PaymentMethod.QR : PaymentMethod.EFECTIVO;

  const parsedAmount1 = useMemo(() => {
    const n = parseInt(amount1, 10);
    return Number.isFinite(n) ? n : 0;
  }, [amount1]);

  const amount2 = total - parsedAmount1;
  const remaining = total - parsedAmount1;

  function handleConfirm() {
    setError(null);

    if (parsedAmount1 <= 0) {
      setError("Ingresa un monto para el primer método.");
      return;
    }
    if (parsedAmount1 >= total) {
      setError("El monto debe ser menor al total.");
      return;
    }
    if (amount2 <= 0) {
      setError("El segundo monto debe ser mayor a cero.");
      return;
    }

    onConfirm(method1, method2, amount2);
  }

  function handleNumpad(d: string) {
    setAmount1((prev) => {
      const base = prev === "" || prev === "0" ? "" : prev;
      const next = base + d;
      if (parseInt(next, 10) >= total) return prev;
      return next;
    });
    setError(null);
  }

  function backspace() {
    setAmount1((prev) => prev.slice(0, -1));
    setError(null);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cobro dividido — {formatPrice(total)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-base font-bold text-white">
              Primer pago
            </label>
            <div className="flex gap-2">
              {METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMethod1(m);
                    setAmount1("");
                    setError(null);
                  }}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    method1 === m
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-accent"
                  }`}
                >
                  {PaymentMethodLabel[m]}
                </button>
              ))}
            </div>
            <div className="w-full text-4xl font-mono text-emerald-400 p-4 bg-slate-900 rounded-lg text-right">
              {amount1 || "0"}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {["7", "8", "9", "4", "5", "6", "1", "2", "3"].map((d) => (
                <Button
                  key={d}
                  type="button"
                  variant="secondary"
                  className="h-16 text-2xl font-bold"
                  onClick={() => handleNumpad(d)}
                >
                  {d}
                </Button>
              ))}
              <Button
                type="button"
                variant="secondary"
                className="h-16 text-2xl font-bold"
                onClick={() => handleNumpad("0")}
              >
                0
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-16 text-2xl font-bold"
                onClick={backspace}
              >
                Borrar
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-base text-white">
            <div className="h-px flex-1 bg-border" />
            <span>queda {formatPrice(Math.max(0, remaining))}</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2">
            <label className="text-base font-bold text-white">
              Segundo pago
            </label>
            <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
              <span className="font-semibold">{PaymentMethodLabel[method2]}</span>
              <span className="ml-2 text-lg font-bold text-primary">
                {parsedAmount1 > 0 && remaining > 0
                  ? formatPrice(amount2)
                  : "—"}
              </span>
            </div>
          </div>

          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={busy}>
            {busy ? "Procesando…" : "Confirmar cobro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
