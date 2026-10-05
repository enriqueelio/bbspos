"use client";

import { Button, Card, CardContent } from "@bbspos/ui";
import { ScrollText } from "lucide-react";
import {
  CustomerLedgerType,
  CustomerLedgerTypeLabel,
  PaymentMethod,
  PaymentMethodLabel,
  formatPrice,
  type CustomerLedgerView,
} from "@bbspos/types";
import { Modal } from "./Modal";

interface LedgerDialogProps {
  customer: {
    name: string;
    ledger: CustomerLedgerView[];
  };
  onClose: () => void;
}

export function LedgerDialog({ customer, onClose }: LedgerDialogProps) {
  return (
    <Modal>
      <h2 className="text-lg font-bold">Movimientos — {customer.name}</h2>
      <div className="max-h-[60vh] space-y-2 overflow-y-auto">
        {customer.ledger.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Este pensionado aún no tiene movimientos.
          </p>
        ) : (
          customer.ledger.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2"
            >
              <div>
                <p className="text-sm font-semibold">
                  {CustomerLedgerTypeLabel[
                    entry.type as keyof typeof CustomerLedgerTypeLabel
                  ] ?? entry.type}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString("es-MX", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                  {entry.paymentMethod
                    ? ` · ${PaymentMethodLabel[entry.paymentMethod]}`
                    : ""}
                </p>
              </div>
              <span
                className={`font-mono font-bold ${
                  entry.type === CustomerLedgerType.CONSUMO
                    ? "text-destructive"
                    : "text-success"
                }`}
              >
                {entry.type === CustomerLedgerType.CONSUMO ? "−" : "+"}
                {formatPrice(entry.amount)}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="flex justify-end pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}