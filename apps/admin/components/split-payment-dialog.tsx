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

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cobro dividido — {formatPrice(total)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
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
            <input
              type="number"
              min={1}
              max={total - 1}
              placeholder="Monto en Bs"
              value={amount1}
              onChange={(e) => {
                setAmount1(e.target.value);
                setError(null);
              }}
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>queda {formatPrice(Math.max(0, remaining))}</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
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
