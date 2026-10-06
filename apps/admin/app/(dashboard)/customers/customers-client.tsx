"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Wallet, Eye, X, Loader2 } from "lucide-react";
import { Button, Card, CardContent, Input, Label, Badge, Tabs, TabsList, TabsTrigger, TabsContent } from "@bbspos/ui";
import { formatPrice } from "@bbspos/types";
import {
  PensionType,
  PensionTypeLabel,
  type PensionType as PensionTypeType,
  CustomerLedgerType,
  CustomerLedgerTypeLabel,
  PaymentMethod,
  PaymentMethodLabel,
} from "@bbspos/types";
import {
  convertToPensionado,
  updateCustomer,
  createClient,
  getCustomerDetail,
  updatePensionadoAccount,
} from "@/app/actions/customers";
import { Modal } from "@/components/shared/Modal";
import { runAction } from "@/components/shared/runAction";
import { BalanceCell } from "@/components/shared/BalanceCell";
import { FundDialog } from "@/components/shared/FundDialog";
import { LedgerDialog } from "@/components/shared/LedgerDialog";
import { UnmarkDialog } from "@/components/shared/UnmarkDialog";

export interface ClientCustomer {
  id: string;
  name: string;
  ci: string | null;
  phone: string;
  pensionType: PensionTypeType | null;
  balance: number;
  creditLimit: number;
  totalVisits: number;
  totalSpent: number;
  lastVisitAt: string | null;
  points: number;
  createdAt: string;
}

interface CustomerDetail {
  id: string;
  name: string;
  ci: string | null;
  phone: string | null;
  createdAt: string;
  totalVisits: number;
  totalSpent: number;
  points: number;
  lastVisitAt: string | null;
  account: {
    id: string;
    pensionType: PensionTypeType;
    balance: number;
    creditLimit: number;
    ledger: Array<{
      id: string;
      accountId: string;
      type: CustomerLedgerType;
      amount: number;
      paymentMethod: PaymentMethod | null;
      orderId: string | null;
      createdAt: string;
    }>;
  } | null;
  recentOrders: Array<{
    id: string;
    seq: number | null;
    daySeq: number | null;
    total: number;
    paymentMethod: string | null;
    deliveredAt: string | null;
    status: string;
  }>;
}

type FilterTab = "todos" | "normales" | "pensionados" | "deudores";

type FormDialogState =
  | { kind: "create" }
  | { kind: "edit"; customer: ClientCustomer }
  | { kind: "activate"; customer: ClientCustomer }
  | null;

type DetailTab = "resumen" | "cuenta" | "historial" | "lealtad";

export function CustomersClient({
  customers,
  currentUserRole,
}: {
  customers: ClientCustomer[];
  currentUserRole: string;
}) {
  const [formDialog, setFormDialog] = useState<FormDialogState>(null);
  const [detailDialog, setDetailDialog] = useState<{ customer: ClientCustomer; detail: CustomerDetail } | null>(null);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("todos");
  const [searchQuery, setSearchQuery] = useState("");

  const isAdmin =
    currentUserRole === "ADMIN" || currentUserRole === "SUPER_ADMIN";

  async function handleOpenDetail(customer: ClientCustomer) {
    setDetailLoading(customer.id);
    try {
      const detail = await getCustomerDetail(customer.id);
      if (detail) {
        setDetailDialog({ customer, detail });
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Error al cargar la ficha");
    } finally {
      setDetailLoading(null);
    }
  }

  const filteredCustomers = useMemo(() => {
    let filtered = [...customers];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.ci?.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q),
      );
    }

    switch (activeTab) {
      case "normales":
        filtered = filtered.filter((c) => c.pensionType === null);
        break;
      case "pensionados":
        filtered = filtered.filter((c) => c.pensionType !== null);
        break;
      case "deudores":
        filtered = filtered.filter(
          (c) => c.pensionType === PensionType.POSTPAGO && c.balance < 0,
        );
        break;
    }

    return filtered;
  }, [customers, activeTab, searchQuery]);

  const tabCounts = useMemo(() => {
    const counts = {
      todos: customers.length,
      normales: customers.filter((c) => c.pensionType === null).length,
      pensionados: customers.filter((c) => c.pensionType !== null).length,
      deudores: customers.filter(
        (c) => c.pensionType === PensionType.POSTPAGO && c.balance < 0,
      ).length,
    };
    return counts;
  }, [customers]);

  function getBadgeVariant(pensionType: PensionTypeType | null): "default" | "success" | "warning" {
    if (!pensionType) return "default";
    if (pensionType === PensionType.PREPAGO) return "success";
    return "warning";
  }

  function getBadgeLabel(pensionType: PensionTypeType | null): string {
    if (!pensionType) return "Mostrador";
    return PensionTypeLabel[pensionType];
  }

  function renderBalance(customer: ClientCustomer) {
    if (customer.pensionType === null) return "—";
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
          {formatPrice(Math.abs(customer.balance))} deuda
        </span>
      );
    }
    return <span className="text-muted-foreground">{formatPrice(0)}</span>;
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Clientes</h1>
          <p className="text-muted-foreground">
            Directorio unificado: clientes de mostrador y pensionados.
            Abre la ficha para gestionar la cuenta corriente.
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

      {notice && (
        <p className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
          {notice}
        </p>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "todos", label: "Todos" },
              { id: "normales", label: "Normales" },
              { id: "pensionados", label: "Pensionados" },
              { id: "deudores", label: "Deudores" },
            ] as const
          ).map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className="h-9"
            >
              {tab.label} ({tabCounts[tab.id]})
            </Button>
          ))}
        </div>

        <Input
          placeholder="Buscar por nombre, CI o teléfono…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md"
        />
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">CI</th>
                <th className="px-4 py-2 font-medium">Teléfono</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">Saldo</th>
                <th className="px-4 py-2 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    {customers.length === 0
                      ? "Aún no hay clientes registrados. Crea el primero con &ldquo;Nuevo cliente&rdquo;."
                      : "No hay clientes que coincidan con el filtro."}
                  </td>
                </tr>
              )}
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2 font-medium">{customer.name}</td>
                  <td className="px-4 py-2">{customer.ci ?? "—"}</td>
                  <td className="px-4 py-2">{customer.phone || "—"}</td>
                  <td className="px-4 py-2">
                    <Badge variant={getBadgeVariant(customer.pensionType)}>
                      {getBadgeLabel(customer.pensionType)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">{renderBalance(customer)}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Ver ficha"
                        aria-label="Ver ficha"
                        onClick={() => handleOpenDetail(customer)}
                        disabled={detailLoading === customer.id}
                        className="h-8 w-8"
                      >
                        {detailLoading === customer.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Editar"
                        aria-label="Editar"
                        onClick={() => {
                          setNotice(null);
                          setFormDialog({ kind: "edit", customer });
                        }}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {detailDialog && (
        <CustomerDetailModal
          customer={detailDialog.customer}
          detail={detailDialog.detail}
          onClose={() => setDetailDialog(null)}
          onNotice={setNotice}
          onRequestActivate={() => {
            setNotice(null);
            setFormDialog({ kind: "activate", customer: detailDialog.customer });
          }}
        />
      )}

      {formDialog && (
        <ClientFormDialog
          dialog={formDialog}
          onClose={() => setFormDialog(null)}
          onDone={(message) => {
            setNotice(message);
            setFormDialog(null);
            // Si la ficha está abierta (p. ej. tras activar la cuenta),
            // refresca su detalle para que refleje el cambio.
            if (detailDialog) {
              void handleOpenDetail(detailDialog.customer);
            }
          }}
        />
      )}
    </div>
  );
}

function ClientFormDialog({
  dialog,
  onClose,
  onDone,
}: {
  dialog: NonNullable<FormDialogState>;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const isEdit = dialog.kind === "edit";
  const isActivate = dialog.kind === "activate";
  const target = isEdit || isActivate ? dialog.customer : null;

  const [name, setName] = useState(target?.name ?? "");
  const [ci, setCi] = useState(target?.ci ?? "");
  const [phone, setPhone] = useState(target?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Para activación de cuenta pensionada
  const [pensionType, setPensionType] = useState<PensionTypeType>("PREPAGO");
  const [creditLimit, setCreditLimit] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"EFECTIVO" | "QR">("EFECTIVO");
  const [activateTab, setActivateTab] = useState<"config" | "saldo">("config");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    runAction(async () => {
      if (isEdit && target) {
        await updateCustomer({
          customerId: target.id,
          name,
          ci,
          phone,
        });
        onDone(`Cliente "${name}" actualizado.`);
      } else if (isActivate && target) {
        await convertToPensionado({
          customerId: target.id,
          pensionType,
          creditLimit: creditLimit ? parseInt(creditLimit, 10) : 0,
          initialBalance: initialBalance ? parseInt(initialBalance, 10) : 0,
          paymentMethod,
        });
        onDone(
          `Cuenta pensionada activada para "${name}" (${pensionType === "PREPAGO" ? "Prepago" : "Postpago"})${initialBalance ? ` con saldo inicial de ${formatPrice(parseInt(initialBalance, 10))}` : ""}.`,
        );
      } else {
        await createClient({
          name,
          ci,
          phone,
        });
        onDone(`Cliente "${name}" creado.`);
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
        {isEdit
          ? `Editar ${target?.name}`
          : isActivate
          ? `Activar cuenta pensionada: ${target?.name}`
          : "Nuevo cliente"}
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
          <Label htmlFor="c-phone">Teléfono (opcional)</Label>
          <Input
            id="c-phone"
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej. 76543210"
          />
        </div>

        {isActivate && (
          <Tabs className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="config"
                onClick={() => setActivateTab("config")}
                data-state={activateTab === "config" ? "active" : "inactive"}
              >
                Configuración
              </TabsTrigger>
              <TabsTrigger
                value="saldo"
                onClick={() => setActivateTab("saldo")}
                data-state={activateTab === "saldo" ? "active" : "inactive"}
              >
                Saldo inicial
              </TabsTrigger>
            </TabsList>
            <TabsContent>
              {activateTab === "config" && (
                <div className="space-y-4 pt-4">
                  <div className="space-y-1">
                    <Label htmlFor="c-type">Modalidad</Label>
                    <select
                      id="c-type"
                      className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm [&>option]:bg-card [&>option]:text-foreground"
                      value={pensionType}
                      onChange={(e) =>
                        setPensionType(e.target.value as PensionTypeType)
                      }
                    >
                      <option value="PREPAGO">Prepago (saldo a favor)</option>
                      <option value="POSTPAGO">Postpago (crédito/deuda)</option>
                    </select>
                  </div>

                  {pensionType === PensionType.POSTPAGO && (
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
                </div>
              )}
              {activateTab === "saldo" && (
                <div className="space-y-4 pt-4">
                  <div className="space-y-1">
                    <Label htmlFor="c-initial">Saldo inicial (Bs)</Label>
                    <Input
                      id="c-initial"
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={initialBalance}
                      onChange={(e) => setInitialBalance(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Medio de pago del saldo inicial</Label>
                    <div className="flex gap-2">
                      {(["EFECTIVO", "QR"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaymentMethod(m)}
                          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                            paymentMethod === m
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card hover:bg-accent"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
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
              : isActivate
              ? "Activar cuenta pensionada"
              : "Crear cliente"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CustomerDetailModal({
  customer,
  detail,
  onClose,
  onNotice,
  onRequestActivate,
}: {
  customer: ClientCustomer;
  detail: CustomerDetail;
  onClose: () => void;
  onNotice: (msg: string) => void;
  onRequestActivate: () => void;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>("resumen");
  const [fundDialog, setFundDialog] = useState<{ customer: ClientCustomer; account: NonNullable<CustomerDetail["account"]> } | null>(null);
  const [ledgerDialog, setLedgerDialog] = useState<{ customer: ClientCustomer; ledger: NonNullable<CustomerDetail["account"]>["ledger"] } | null>(null);
  const [unmarkDialog, setUnmarkDialog] = useState<{ customer: ClientCustomer; account: NonNullable<CustomerDetail["account"]> } | null>(null);
  const [editAccountDialog, setEditAccountDialog] = useState<{ customer: ClientCustomer; account: NonNullable<CustomerDetail["account"]> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFundDone(message: string) {
    onNotice(message);
    setFundDialog(null);
    // Refresh detail
    getCustomerDetail(customer.id).then((d) => d && onClose());
  }

  function handleFundError(message: string) {
    setError(message);
  }

  function handleUnmarkDone(message: string) {
    onNotice(message);
    setUnmarkDialog(null);
    onClose();
  }

  function handleUnmarkError(message: string) {
    setError(message);
  }

  function handleEditAccountDone(message: string) {
    onNotice(message);
    setEditAccountDialog(null);
    getCustomerDetail(customer.id).then((d) => d && onClose());
  }

  return (
    <Modal className="max-w-3xl max-h-[90vh] flex flex-col">
      <div className="flex items-center justify-between border-b pb-4 mb-4">
        <div>
          <h2 className="text-xl font-bold">{customer.name}</h2>
          <p className="text-sm text-muted-foreground">
            {customer.ci ? `CI: ${customer.ci}` : "Sin CI"} · {customer.phone || "Sin teléfono"}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <Tabs className="flex-1 overflow-hidden">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger
            value="resumen"
            onClick={() => setActiveTab("resumen")}
            data-state={activeTab === "resumen" ? "active" : "inactive"}
          >
            Resumen
          </TabsTrigger>
          <TabsTrigger
            value="cuenta"
            onClick={() => setActiveTab("cuenta")}
            data-state={activeTab === "cuenta" ? "active" : "inactive"}
          >
            Cuenta
          </TabsTrigger>
          <TabsTrigger
            value="historial"
            onClick={() => setActiveTab("historial")}
            data-state={activeTab === "historial" ? "active" : "inactive"}
          >
            Historial
          </TabsTrigger>
          <TabsTrigger
            value="lealtad"
            onClick={() => setActiveTab("lealtad")}
            data-state={activeTab === "lealtad" ? "active" : "inactive"}
          >
            Lealtad
          </TabsTrigger>
        </TabsList>

        <TabsContent className="overflow-y-auto p-4">
          {activeTab === "resumen" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">Creado el</p>
                  <p className="font-mono text-lg">
                    {new Date(detail.createdAt).toLocaleString("es-MX", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge variant={detail.account ? (detail.account.pensionType === PensionType.PREPAGO ? "success" : "warning") : "default"}>
                    {detail.account
                      ? PensionTypeLabel[detail.account.pensionType]
                      : "Mostrador"}
                  </Badge>
                </div>
              </div>

              {detail.account && (
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <h3 className="font-semibold mb-3">Cuenta Pensionada</h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Modalidad</p>
                      <p className="font-medium">{PensionTypeLabel[detail.account.pensionType]}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Saldo</p>
                      <BalanceCell
                        balance={detail.account.balance}
                        pensionType={detail.account.pensionType}
                        creditLimit={detail.account.creditLimit}
                      />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Límite de crédito
                      </p>
                      <p className="font-medium">
                        {detail.account.pensionType === PensionType.POSTPAGO
                          ? detail.account.creditLimit > 0
                            ? formatPrice(detail.account.creditLimit)
                            : "Sin límite"
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      onClick={() => setFundDialog({ customer, account: detail.account! })}
                    >
                      {detail.account.pensionType === PensionType.PREPAGO
                        ? "Recargar saldo"
                        : "Pagar deuda"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLedgerDialog({ customer, ledger: detail.account!.ledger })}
                    >
                      Ver movimientos
                    </Button>
                    {detail.account.balance === 0 && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setUnmarkDialog({ customer, account: detail.account! })}
                      >
                        Desmarcar pensionado
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditAccountDialog({ customer, account: detail.account! })}
                    >
                      Configurar cuenta
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "cuenta" && !detail.account && (
            <div className="rounded-lg border border-border bg-muted/40 p-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Este cliente no tiene cuenta corriente: paga al momento
                (mostrador).
              </p>
              <Button size="sm" onClick={onRequestActivate}>
                <Wallet className="mr-1 h-4 w-4" />
                Activar cuenta pensionada
              </Button>
            </div>
          )}

          {activeTab === "cuenta" && detail.account && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">Modalidad</p>
                  <p className="font-medium">{PensionTypeLabel[detail.account.pensionType]}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">Saldo</p>
                  <BalanceCell
                    balance={detail.account.balance}
                    pensionType={detail.account.pensionType}
                    creditLimit={detail.account.creditLimit}
                  />
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">Límite de crédito</p>
                  <p className="font-medium">
                    {detail.account.creditLimit > 0
                      ? formatPrice(detail.account.creditLimit)
                      : "Sin límite"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Movimientos (últimos 50)</h4>
                {detail.account.ledger.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin movimientos</p>
                ) : (
                  detail.account.ledger.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          {CustomerLedgerTypeLabel[entry.type as keyof typeof CustomerLedgerTypeLabel] ?? entry.type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString("es-MX", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                          {entry.paymentMethod ? ` · ${PaymentMethodLabel[entry.paymentMethod as keyof typeof PaymentMethodLabel]}` : ""}
                        </p>
                      </div>
                      <span
                        className={`font-mono font-bold ${
                          entry.type === CustomerLedgerType.CONSUMO ? "text-destructive" : "text-success"
                        }`}
                      >
                        {entry.type === CustomerLedgerType.CONSUMO ? "−" : "+"}
                        {formatPrice(entry.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "historial" && (
            <div className="space-y-4">
              <h4 className="font-semibold">Pedidos recientes (entregados y cobrados)</h4>
              {detail.recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin pedidos recientes</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left">
                        <th className="px-4 py-2 font-medium">Ticket</th>
                        <th className="px-4 py-2 font-medium">Fecha</th>
                        <th className="px-4 py-2 font-medium">Total</th>
                        <th className="px-4 py-2 font-medium">Pago</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.recentOrders.map((order) => (
                        <tr key={order.id} className="border-b last:border-b-0">
                          <td className="px-4 py-2 font-mono">
                            #{order.daySeq ?? order.seq ?? "—"}
                          </td>
                          <td className="px-4 py-2">
                            {order.deliveredAt
                              ? new Date(order.deliveredAt).toLocaleString("es-MX", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })
                              : "—"}
                          </td>
                          <td className="px-4 py-2 text-right">{formatPrice(order.total)}</td>
                          <td className="px-4 py-2">
                            {order.paymentMethod ? PaymentMethodLabel[order.paymentMethod as keyof typeof PaymentMethodLabel] : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "lealtad" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-lg border border-border bg-muted/40 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Visitas totales</p>
                  <p className="text-3xl font-bold">{detail.totalVisits}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Gasto total</p>
                  <p className="text-3xl font-bold">{formatPrice(detail.totalSpent)}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Puntos</p>
                  <p className="text-3xl font-bold">{detail.points}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Última visita</p>
                  <p className="text-lg font-medium">
                    {detail.lastVisitAt
                      ? new Date(detail.lastVisitAt).toLocaleDateString("es-MX", {
                          dateStyle: "medium",
                        })
                      : "—"}
                  </p>
                </div>
              </div>

              {detail.account?.pensionType === PensionType.POSTPAGO && (
                <div className="rounded-lg border border-warning/40 bg-warning/10 p-4">
                  <p className="text-sm text-warning">
                    Este cliente es Pensionado Postpago. Sus consumos a cuenta no generan lealtad
                    (visitas, gasto, puntos ni nivel). Solo sus compras pagadas en efectivo/QR suman.
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </TabsContent>
      </Tabs>

      {fundDialog && (
        <FundDialog
          customer={{
            id: fundDialog.customer.id,
            name: fundDialog.customer.name,
            pensionType: fundDialog.account!.pensionType,
            balance: fundDialog.account!.balance,
            creditLimit: fundDialog.account!.creditLimit,
          }}
          onClose={() => setFundDialog(null)}
          onDone={handleFundDone}
          onError={handleFundError}
        />
      )}

      {ledgerDialog && (
        <LedgerDialog
          customer={{
            name: ledgerDialog.customer.name,
            ledger: ledgerDialog.ledger,
          }}
          onClose={() => setLedgerDialog(null)}
        />
      )}

      {unmarkDialog && (
        <UnmarkDialog
          customer={{
            id: unmarkDialog.customer.id,
            name: unmarkDialog.customer.name,
            balance: unmarkDialog.account!.balance,
            pensionType: unmarkDialog.account!.pensionType,
            creditLimit: unmarkDialog.account!.creditLimit,
          }}
          onClose={() => setUnmarkDialog(null)}
          onError={handleUnmarkError}
          onDone={handleUnmarkDone}
        />
      )}

      {editAccountDialog && (
        <EditAccountDialog
          customer={editAccountDialog.customer}
          account={editAccountDialog.account!}
          onClose={() => setEditAccountDialog(null)}
          onDone={handleEditAccountDone}
          onError={setError}
        />
      )}
    </Modal>
  );
}

function EditAccountDialog({
  customer,
  account,
  onClose,
  onDone,
  onError,
}: {
  customer: ClientCustomer;
  account: NonNullable<CustomerDetail["account"]>;
  onClose: () => void;
  onDone: (message: string) => void;
  onError: (msg: string) => void;
}) {
  const [pensionType, setPensionType] = useState<PensionTypeType>(account.pensionType);
  const [creditLimit, setCreditLimit] = useState(String(account.creditLimit ?? ""));
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setLocalError(null);
    runAction(async () => {
      await updatePensionadoAccount({
        customerId: customer.id,
        pensionType,
        creditLimit: creditLimit ? parseInt(creditLimit, 10) : 0,
      });
      onDone(`Modalidad de "${customer.name}" actualizada.`);
    }, (msg) => {
      onError(msg);
      setLocalError(msg);
      setSaving(false);
    });
  }

  return (
    <Modal>
      <h2 className="text-lg font-bold">Configurar cuenta de {customer.name}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="c-type">Modalidad</Label>
          <select
            id="c-type"
            className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm [&>option]:bg-card [&>option]:text-foreground"
            value={pensionType}
            onChange={(e) => setPensionType(e.target.value as PensionTypeType)}
          >
            <option value="PREPAGO">Prepago (saldo a favor)</option>
            <option value="POSTPAGO">Postpago (crédito/deuda)</option>
          </select>
        </div>

        {pensionType === PensionType.POSTPAGO && (
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