"use client";

import { useState } from "react";
import { Plus, Wallet, ScrollText, UserMinus } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Label } from "@bbspos/ui";
import {
  PensionType as PensionTypeValue,
  PensionTypeLabel,
  PensionTypeList,
  formatPrice,
  type CustomerLedgerView,
  type PensionType,
} from "@bbspos/types";
import {
  convertToPensionado,
  updatePensionadoAccount,
} from "@/app/actions/customers";
import { Modal } from "@/components/shared/Modal";
import { runAction } from "@/components/shared/runAction";
import { BalanceCell } from "@/components/shared/BalanceCell";
import { FundDialog } from "@/components/shared/FundDialog";
import { LedgerDialog } from "@/components/shared/LedgerDialog";
import { UnmarkDialog } from "@/components/shared/UnmarkDialog";

export interface PensionadoCustomer {
  id: string;
  name: string;
  pensionType: PensionType;
  balance: number;
  creditLimit: number;
  createdAt: string;
  ledger: CustomerLedgerView[];
}

export interface PensionadosKPIs {
  totalSaldoAFavor: number;
  totalDeudaPorCobrar: number;
}

/** Cliente de mostrador (sin cuenta) candidato a abrir cuenta pensionada. */
export interface AvailableClient {
  id: string;
  name: string;
  ci: string | null;
}

type FundDialogState = { customer: PensionadoCustomer } | null;
type LedgerDialogState = { customer: PensionadoCustomer } | null;
type UnmarkDialogState = { customer: PensionadoCustomer } | null;
type FormDialogState =
  | { kind: "editAccount"; customer: PensionadoCustomer }
  | null;

export function PensionadosClient({
  customers,
  kpis,
  currentUserRole,
  availableClients,
}: {
  customers: PensionadoCustomer[];
  kpis: PensionadosKPIs;
  currentUserRole: string;
  availableClients: AvailableClient[];
}) {
  const [fundDialog, setFundDialog] = useState<FundDialogState>(null);
  const [ledgerDialog, setLedgerDialog] = useState<LedgerDialogState>(null);
  const [unmarkDialog, setUnmarkDialog] = useState<UnmarkDialogState>(null);
  const [formDialog, setFormDialog] = useState<FormDialogState>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isAdmin =
    currentUserRole === "ADMIN" || currentUserRole === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Cuentas Pensionadas</h1>
          <p className="text-muted-foreground">
            Panel financiero: saldos, recargas, pagos de deuda y límites de crédito.
          </p>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            onClick={() => {
              setError(null);
              setNotice(null);
              setAddOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Agregar Pensionado
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

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Saldo total a favor (Prepago)</p>
            <p className="text-2xl font-bold text-success">
              {formatPrice(kpis.totalSaldoAFavor)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Deuda total por cobrar (Postpago)</p>
            <p className="text-2xl font-bold text-destructive">
              {formatPrice(kpis.totalDeudaPorCobrar)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-2 font-medium">Cliente</th>
                <th className="px-4 py-2 font-medium">Modalidad</th>
                <th className="px-4 py-2 font-medium">Saldo / Deuda</th>
                <th className="px-4 py-2 font-medium">Límite de crédito</th>
                <th className="px-4 py-2 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No hay cuentas pensionadas registradas.
                  </td>
                </tr>
              )}
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2 font-medium">{customer.name}</td>
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
                    <BalanceCell
                      balance={customer.balance}
                      pensionType={customer.pensionType}
                      creditLimit={customer.creditLimit}
                    />
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
                      {isAdmin && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setError(null);
                              setFormDialog({ kind: "editAccount", customer });
                            }}
                          >
                            Configurar cuenta
                          </Button>
                          {customer.balance === 0 && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setNotice(null);
                                setError(null);
                                setUnmarkDialog({ customer });
                              }}
                            >
                              <UserMinus className="mr-1 h-4 w-4" /> Desmarcar
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {addOpen && (
        <AddPensionadoDialog
          clients={availableClients}
          onClose={() => setAddOpen(false)}
          onDone={(message) => {
            setNotice(message);
            setAddOpen(false);
          }}
          onError={setError}
        />
      )}

      {formDialog && (
        <EditAccountDialog
          dialog={formDialog}
          onClose={() => setFormDialog(null)}
          onDone={(message) => {
            setNotice(message);
            setFormDialog(null);
          }}
          onError={setError}
        />
      )}

      {fundDialog && (
        <FundDialog
          customer={fundDialog.customer}
          onClose={() => setFundDialog(null)}
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

      {unmarkDialog && (
        <UnmarkDialog
          customer={unmarkDialog.customer}
          onClose={() => setUnmarkDialog(null)}
          onError={setError}
          onDone={(message) => {
            setNotice(message);
            setUnmarkDialog(null);
          }}
        />
      )}
    </div>
  );
}

function EditAccountDialog({
  dialog,
  onClose,
  onDone,
  onError,
}: {
  dialog: NonNullable<FormDialogState>;
  onClose: () => void;
  onDone: (message: string) => void;
  onError: (msg: string) => void;
}) {
  const isEditAccount = dialog.kind === "editAccount";
  const target = dialog.customer;

  const [pensionType, setPensionType] = useState<PensionType>(
    target.pensionType,
  );
  const [creditLimit, setCreditLimit] = useState(
    String(target.creditLimit ?? ""),
  );
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setLocalError(null);
    runAction(async () => {
      await updatePensionadoAccount({
        customerId: target.id,
        pensionType,
        creditLimit: creditLimit ? parseInt(creditLimit, 10) : 0,
      });
      onDone(`Modalidad de "${target.name}" actualizada.`);
    }, (msg) => {
      onError(msg);
      setLocalError(msg);
      setSaving(false);
    });
  }

  return (
    <Modal>
      <h2 className="text-lg font-bold">
        {isEditAccount ? `Configurar cuenta de ${target.name}` : "Configurar cuenta"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
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

        {localError && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {localError}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Cambiar modalidad"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Modal "Abrir Cuenta Pensionada": convierte un cliente de mostrador en
 *  pensionado vía convertToPensionado (requiere sesión admin). */
function AddPensionadoDialog({
  clients,
  onClose,
  onDone,
  onError,
}: {
  clients: AvailableClient[];
  onClose: () => void;
  onDone: (message: string) => void;
  onError: (msg: string) => void;
}) {
  const [customerId, setCustomerId] = useState("");
  const [pensionType, setPensionType] = useState<PensionType>(
    PensionTypeValue.PREPAGO,
  );
  const [initialBalance, setInitialBalance] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const client = clients.find((c) => c.id === customerId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!client) {
      setLocalError("Selecciona un cliente de mostrador.");
      return;
    }
    setSaving(true);
    setLocalError(null);
    runAction(async () => {
      await convertToPensionado({
        customerId: client.id,
        pensionType,
        creditLimit:
          pensionType === PensionTypeValue.POSTPAGO && creditLimit
            ? parseInt(creditLimit, 10)
            : undefined,
        initialBalance:
          pensionType === PensionTypeValue.PREPAGO && initialBalance
            ? parseInt(initialBalance, 10)
            : undefined,
      });
      const saldoNote =
        pensionType === PensionTypeValue.PREPAGO && initialBalance
          ? ` con recarga inicial de ${formatPrice(parseInt(initialBalance, 10))}`
          : "";
      onDone(
        `Cuenta pensionada abierta para "${client.name}" (${PensionTypeLabel[pensionType]})${saldoNote}.`,
      );
    }, (msg) => {
      onError(msg);
      setLocalError(msg);
      setSaving(false);
    });
  }

  return (
    <Modal>
      <h2 className="text-lg font-bold">Abrir Cuenta Pensionada</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="p-client">Cliente</Label>
          {clients.length === 0 ? (
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              No hay clientes de mostrador disponibles: todos ya tienen cuenta
              o aún no hay clientes registrados.
            </p>
          ) : (
            <select
              id="p-client"
              required
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm [&>option]:bg-card [&>option]:text-foreground"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setLocalError(null);
              }}
            >
              <option value="" disabled>
                Selecciona un cliente…
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.ci ? ` · CI ${c.ci}` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="p-type">Modalidad</Label>
          <select
            id="p-type"
            className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm [&>option]:bg-card [&>option]:text-foreground"
            value={pensionType}
            onChange={(e) =>
              setPensionType(e.target.value as PensionType)
            }
          >
            {PensionTypeList.map((t) => (
              <option key={t} value={t}>
                {PensionTypeLabel[t]}
              </option>
            ))}
          </select>
        </div>

        {pensionType === PensionTypeValue.PREPAGO && (
          <div className="space-y-1">
            <Label htmlFor="p-balance">Recarga inicial (Bs, opcional)</Label>
            <Input
              id="p-balance"
              type="number"
              min={0}
              inputMode="numeric"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="0"
            />
          </div>
        )}

        {pensionType === PensionTypeValue.POSTPAGO && (
          <div className="space-y-1">
            <Label htmlFor="p-credit">
              Límite de crédito (Bs, 0 = sin límite)
            </Label>
            <Input
              id="p-credit"
              type="number"
              min={0}
              inputMode="numeric"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              El postpago no genera fidelización: sus consumos a cuenta no
              suman visitas, gasto ni puntos.
            </p>
          </div>
        )}

        {localError && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {localError}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || !client}>
            {saving ? "Abriendo…" : "Abrir cuenta"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}