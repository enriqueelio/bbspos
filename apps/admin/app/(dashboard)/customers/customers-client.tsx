"use client";

import { useMemo, useState } from "react";
import { Plus, Wallet, ScrollText, Pencil } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Label } from "@bbspos/ui";
import {
  CustomerLedgerTypeLabel,
  CustomerLedgerType,
  PaymentMethod,
  PaymentMethodLabel,
  PensionType as PensionTypeValue,
  PensionTypeLabel,
  PensionTypeList,
  formatPrice,
  type CustomerLedgerView,
  type PaymentMethod as PaymentMethodType,
  type PensionType,
} from "@bbspos/types";
import {
  addCustomerFunds,
  createCustomer,
  updateCustomer,
} from "@/app/actions/customers";

export interface PensionCustomer {
  id: string;
  name: string;
  ci: string | null;
  phone: string;
  pensionType: PensionType;
  balance: number;
  creditLimit: number;
  createdAt: string;
  ledger: CustomerLedgerView[];
}

function runAction(fn: () => Promise<void>, onError: (msg: string) => void) {
  fn().catch((e) =>
    onError(e instanceof Error ? e.message : "Ocurrió un error."),
  );
}

type FundDialogState = { customer: PensionCustomer } | null;
type LedgerDialogState = { customer: PensionCustomer } | null;
type FormDialogState =
  | { kind: "create" }
  | { kind: "edit"; customer: PensionCustomer }
  | null;

export function CustomersClient({
  customers,
  currentUserRole,
}: {
  customers: PensionCustomer[];
  currentUserRole: string;
}) {
  const [fundDialog, setFundDialog] = useState<FundDialogState>(null);
  const [ledgerDialog, setLedgerDialog] = useState<LedgerDialogState>(null);
  const [formDialog, setFormDialog] = useState<FormDialogState>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isAdmin =
    currentUserRole === "ADMIN" || currentUserRole === "SUPER_ADMIN";

  function closeDialogs() {
    setFundDialog(null);
    setLedgerDialog(null);
    setFormDialog(null);
    setError(null);
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Clientes / Pensionados</h1>
          <p className="text-muted-foreground">
            Cuentas corrientes Prepago y Postpago: saldos, recargas y pagos de
            deuda.
          </p>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            onClick={() => {
              setNotice(null);
              setFormDialog({ kind: "create" });
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Nuevo cliente
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {notice && (
        <p className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
          {notice}
        </p>
      )}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">CI</th>
                <th className="px-4 py-2 font-medium">Teléfono</th>
                <th className="px-4 py-2 font-medium">Modalidad</th>
                <th className="px-4 py-2 font-medium">Saldo</th>
                <th className="px-4 py-2 font-medium">Límite (Postpago)</th>
                <th className="px-4 py-2 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Aún no hay clientes registrados. Crea el primero con "Nuevo
                    cliente".
                  </td>
                </tr>
              )}
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2 font-medium">{customer.name}</td>
                  <td className="px-4 py-2">{customer.ci ?? "—"}</td>
                  <td className="px-4 py-2">{customer.phone}</td>
                  <td className="px-4 py-2">
                    <Badge
                      variant={
                        customer.pensionType === PensionTypeValue.POSTPAGO
                          ? "warning"
                          : "default"
                      }
                    >
                      {PensionTypeLabel[customer.pensionType]}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <BalanceCell customer={customer} />
                  </td>
                  <td className="px-4 py-2">
                    {customer.pensionType === PensionTypeValue.POSTPAGO
                      ? customer.creditLimit > 0
                        ? formatPrice(customer.creditLimit)
                        : "Sin límite"
                      : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setNotice(null);
                          setFormDialog({ kind: "edit", customer });
                        }}
                      >
                        <Pencil className="mr-1 h-4 w-4" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setError(null);
                          setFundDialog({ customer });
                        }}
                      >
                        <Wallet className="mr-1 h-4 w-4" />
                        {customer.pensionType === PensionTypeValue.PREPAGO
                          ? "Recargar Saldo"
                          : "Pagar Deuda"}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setError(null);
                          setLedgerDialog({ customer });
                        }}
                      >
                        <ScrollText className="mr-1 h-4 w-4" /> Movimientos
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {formDialog && (
        <CustomerFormDialog
          dialog={formDialog}
          onClose={() => setFormDialog(null)}
          onError={setError}
        />
      )}

      {fundDialog && (
        <FundDialog
          customer={fundDialog.customer}
          onClose={() => setFundDialog(null)}
          onError={setError}
          onDone={(message) => {
            setNotice(message);
            setFundDialog(null);
          }}
        />
      )}

      {ledgerDialog && (
        <LedgerDialog
          customer={ledgerDialog.customer}
          onClose={() => setLedgerDialog(null)}
        />
      )}
    </div>
  );
}

function BalanceCell({ customer }: { customer: PensionCustomer }) {
  if (customer.balance > 0) {
    return (
      <span className="font-bold text-success">
        {formatPrice(customer.balance)} a favor
      </span>
    );
  }
  if (customer.balance < 0) {
    return (
      <span className="font-bold text-destructive">
        {formatPrice(Math.abs(customer.balance))} de deuda
      </span>
    );
  }
  return <span className="text-muted-foreground">{formatPrice(0)}</span>;
}

function CustomerFormDialog({
  dialog,
  onClose,
  onError,
}: {
  dialog: NonNullable<FormDialogState>;
  onClose: () => void;
  onError: (msg: string) => void;
}) {
  const isEdit = dialog.kind === "edit";
  const target = isEdit ? dialog.customer : null;

  const [name, setName] = useState(target?.name ?? "");
  const [ci, setCi] = useState(target?.ci ?? "");
  const [phone, setPhone] = useState(target?.phone ?? "");
  const [pensionType, setPensionType] = useState<PensionType>(
    target?.pensionType ?? "PREPAGO",
  );
  const [creditLimit, setCreditLimit] = useState(
    target && target.pensionType === PensionTypeValue.POSTPAGO
      ? String(target.creditLimit)
      : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    runAction(async () => {
      const creditLimitValue =
        pensionType === PensionTypeValue.POSTPAGO
          ? parseInt(creditLimit, 10) || 0
          : 0;
      if (isEdit && target) {
        await updateCustomer({
          customerId: target.id,
          name,
          ci,
          phone,
          pensionType,
          creditLimit: creditLimitValue,
        });
      } else {
        await createCustomer({
          name,
          ci,
          phone,
          pensionType,
          creditLimit: creditLimitValue,
        });
      }
      onClose();
    }, (msg) => {
      setError(msg);
      setSaving(false);
    });
  }

  return (
    <Modal>
      <h2 className="text-lg font-bold">
        {isEdit ? `Editar ${target?.name}` : "Nuevo cliente"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="c-name">Nombre</Label>
          <Input
            id="c-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Doña María Rojas"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="c-ci">CI (opcional)</Label>
          <Input
            id="c-ci"
            type="text"
            autoComplete="off"
            value={ci}
            onChange={(e) => setCi(e.target.value)}
            placeholder="Ej. 4567890"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="c-phone">Teléfono</Label>
          <Input
            id="c-phone"
            type="text"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej. 76543210"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="c-type">Modalidad</Label>
          <select
            id="c-type"
            className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm [&>option]:bg-card [&>option]:text-foreground"
            value={pensionType}
            onChange={(e) => setPensionType(e.target.value as PensionType)}
          >
            {PensionTypeList.map((t) => (
              <option key={t} value={t}>
                {PensionTypeLabel[t]}
              </option>
            ))}
          </select>
        </div>

        {pensionType === PensionTypeValue.POSTPAGO && (
          <div className="space-y-1">
            <Label htmlFor="c-credit">
              Límite de crédito (Bs, 0 = sin límite)
            </Label>
            <Input
              id="c-credit"
              type="number"
              min={0}
              inputMode="numeric"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              placeholder="0"
            />
          </div>
        )}

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving
              ? "Guardando…"
              : isEdit
                ? "Guardar cambios"
                : "Crear cliente"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function FundDialog({
  customer,
  onClose,
  onError,
  onDone,
}: {
  customer: PensionCustomer;
  onClose: () => void;
  onError: (msg: string) => void;
  onDone: (message: string) => void;
}) {
  const isPrepago = customer.pensionType === PensionTypeValue.PREPAGO;
  const title = isPrepago ? "Recargar saldo" : "Pagar deuda";

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethodType>(
    PaymentMethod.EFECTIVO,
  );
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
            <BalanceInline customer={customer} />
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

function BalanceInline({ customer }: { customer: PensionCustomer }) {
  if (customer.balance > 0) {
    return (
      <span className="font-bold text-success">
        {formatPrice(customer.balance)} a favor
      </span>
    );
  }
  if (customer.balance < 0) {
    return (
      <span className="font-bold text-destructive">
        {formatPrice(Math.abs(customer.balance))} de deuda
      </span>
    );
  }
  return <span className="font-semibold">{formatPrice(0)}</span>;
}

function LedgerDialog({
  customer,
  onClose,
}: {
  customer: PensionCustomer;
  onClose: () => void;
}) {
  return (
    <Modal>
      <h2 className="text-lg font-bold">Movimientos — {customer.name}</h2>
      <div className="max-h-[60vh] space-y-2 overflow-y-auto">
        {customer.ledger.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Este cliente aún no tiene movimientos.
          </p>
        ) : (
          customer.ledger.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2"
            >
              <div>
                <p className="text-sm font-semibold">
                  {CustomerLedgerTypeLabel[entry.type as keyof typeof CustomerLedgerTypeLabel] ??
                    entry.type}
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

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6">{children}</CardContent>
      </Card>
    </div>
  );
}