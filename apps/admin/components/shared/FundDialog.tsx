"use client";

import { useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { Badge, Button, Input, Label } from "@bbspos/ui";
import {
  PaymentMethod,
  PaymentMethodLabel,
  PensionType,
  PensionTypeLabel,
  formatPrice,
  type PaymentMethod as PaymentMethodType,
  type PensionType as PensionTypeType,
} from "@bbspos/types";
import { addCustomerFunds } from "@/app/actions/customers";
import { Modal } from "./Modal";
import { runAction } from "./runAction";
import { BalanceInline } from "./BalanceCell";

interface FundDialogProps {
  customer: {
    id: string;
    name: string;
    pensionType: PensionTypeType;
    balance: number;
    creditLimit: number;
  };
  onClose: () => void;
  onDone: (message: string) => void;
  onError?: (message: string) => void;
}

export function FundDialog({ customer, onClose, onDone }: FundDialogProps) {
  const isPrepago = customer.pensionType === PensionType.PREPAGO;
  const title = isPrepago ? "Recargar saldo" : "Pagar deuda";

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethodType>(PaymentMethod.EFECTIVO);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = useMemo(() => {
    const n = parseInt(amount, 10);
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  function handleConfirm() {
    if (parsedAmount <= 0) {
      setError("Ingresa un monto mayor a cero.");
      return;
    }
    setSaving(true);
    setError(null);
    runAction(async () => {
      await addCustomerFunds({
        customerId: customer.id,
        amount: parsedAmount,
        paymentMethod: method,
      });
      onDone(
        `${title} registrada: ${formatPrice(parsedAmount)} (${PaymentMethodLabel[method]}).`,
      );
    }, (msg) => {
      setError(msg);
      setSaving(false);
    });
  }

  function handleNumpad(d: string) {
    setAmount((prev) => (prev === "0" ? d : prev + d));
    setError(null);
  }

  function backspace() {
    setAmount((prev) => prev.slice(0, -1));
    setError(null);
  }

  return (
    <Modal>
      <h2 className="text-lg font-bold">
        {title} — {customer.name}
      </h2>
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
          <p>
            Modalidad:{" "}
            <Badge
              variant={isPrepago ? "default" : "warning"}
              className="ml-1"
            >
              {PensionTypeLabel[customer.pensionType]}
            </Badge>
          </p>
          <p className="mt-1">
            Saldo actual:{" "}
            <BalanceInline
              balance={customer.balance}
              pensionType={customer.pensionType}
              creditLimit={customer.creditLimit}
            />
          </p>
        </div>

        <div className="w-full rounded-lg border border-border bg-slate-900 p-4 text-right font-mono text-4xl font-black text-emerald-400">
          {amount || "0"}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {["7", "8", "9", "4", "5", "6", "1", "2", "3"].map((d) => (
            <Button
              key={d}
              type="button"
              variant="secondary"
              className="h-14 text-2xl font-bold"
              onClick={() => handleNumpad(d)}
            >
              {d}
            </Button>
          ))}
          <Button
            type="button"
            variant="secondary"
            className="h-14 text-2xl font-bold"
            onClick={() => handleNumpad("0")}
          >
            0
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-14 text-2xl font-bold"
            onClick={backspace}
          >
            Borrar
          </Button>
        </div>

        <div className="space-y-1">
          <Label>Medio de pago (ingresa a caja)</Label>
          <div className="flex gap-2">
            {[PaymentMethod.EFECTIVO, PaymentMethod.QR].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  method === m
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                {PaymentMethodLabel[m]}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={saving}>
            {saving ? "Registrando…" : "Registrar abono"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}