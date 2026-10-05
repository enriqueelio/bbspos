"use client";

import { useState } from "react";
import { Button, Card, CardContent } from "@bbspos/ui";
import { UserMinus } from "lucide-react";
import { formatPrice } from "@bbspos/types";
import { PensionType } from "@bbspos/types";
import { removePensionadoStatus } from "@/app/actions/customers";
import { Modal } from "./Modal";
import { runAction } from "./runAction";
import { BalanceInline } from "./BalanceCell";

interface UnmarkDialogProps {
  customer: {
    id: string;
    name: string;
    balance: number;
    pensionType: PensionType;
    creditLimit: number;
  };
  onClose: () => void;
  onError: (msg: string) => void;
  onDone: (message: string) => void;
}

export function UnmarkDialog({
  customer,
  onClose,
  onError,
  onDone,
}: UnmarkDialogProps) {
  const [saving, setSaving] = useState(false);

  function handleConfirm() {
    setSaving(true);
    runAction(async () => {
      await removePensionadoStatus(customer.id);
      onDone(`${customer.name} ya no es pensionado.`);
    }, (msg) => {
      onError(msg);
      onClose();
    });
  }

  return (
    <Modal>
      <h2 className="text-lg font-bold">Desmarcar a {customer.name}</h2>
      <div className="space-y-3 text-sm">
        <p>
          Se borra la cuenta corriente y todo su historial de movimientos. El
          cliente vuelve a la lista de Clientes (Mostrador) y deja de aparecer en
          el cobro &laquo;PENSIONADO&raquo; del cajero.
        </p>
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2">
          Saldo actual:{" "}
          <BalanceInline
            balance={customer.balance}
            pensionType={customer.pensionType}
            creditLimit={customer.creditLimit}
          />
        </p>
        {customer.balance !== 0 && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
            Con saldo distinto de cero no se puede desmarcar. Llévalo a cero
            primero.
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button type="button" variant="destructive" onClick={handleConfirm} disabled={saving}>
          {saving ? "Desmarcando…" : "Desmarcar pensionado"}
        </Button>
      </div>
    </Modal>
  );
}