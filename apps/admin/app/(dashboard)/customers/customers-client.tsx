"use client";

import { useState } from "react";
import { Plus, Pencil, Wallet } from "lucide-react";
import { Button, Card, CardContent, Input, Label } from "@bbspos/ui";
import { formatPrice } from "@bbspos/types";
import {
  createClient,
  convertToPensionado,
  updateCustomer,
} from "@/app/actions/customers";

export interface ClientCustomer {
  id: string;
  name: string;
  ci: string | null;
  phone: string;
  totalVisits: number;
  totalSpent: number;
  lastVisitAt: string | null;
  points: number;
  createdAt: string;
}

function runAction(fn: () => Promise<void>, onError: (msg: string) => void) {
  fn().catch((e) =>
    onError(e instanceof Error ? e.message : "Ocurrió un error."),
  );
}

type FormDialogState =
  | { kind: "create" }
  | { kind: "edit"; customer: ClientCustomer }
  | { kind: "convert"; customer: ClientCustomer }
  | null;

export function CustomersClient({
  customers,
  currentUserRole,
}: {
  customers: ClientCustomer[];
  currentUserRole: string;
}) {
  const [formDialog, setFormDialog] = useState<FormDialogState>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isAdmin =
    currentUserRole === "ADMIN" || currentUserRole === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Clientes (Mostrador)</h1>
          <p className="text-muted-foreground">
            Clientes de mostrador: solo acumulan lealtad (visitas, gasto, puntos).
            Usa &ldquo;Convertir en pensionado&rdquo; para darles cuenta corriente.
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

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">CI</th>
                <th className="px-4 py-2 font-medium">Teléfono</th>
                <th className="px-4 py-2 font-medium">Visitas</th>
                <th className="px-4 py-2 font-medium">Gasto total</th>
                <th className="px-4 py-2 font-medium">Puntos</th>
                <th className="px-4 py-2 font-medium">Última visita</th>
                <th className="px-4 py-2 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Aún no hay clientes registrados. Crea el primero con &ldquo;Nuevo
                    cliente&rdquo;.
                  </td>
                </tr>
              )}
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2 font-medium">{customer.name}</td>
                  <td className="px-4 py-2">{customer.ci ?? "—"}</td>
                  <td className="px-4 py-2">{customer.phone || "—"}</td>
                  <td className="px-4 py-2 text-center">{customer.totalVisits}</td>
                  <td className="px-4 py-2 text-right">{formatPrice(customer.totalSpent)}</td>
                  <td className="px-4 py-2 text-center font-bold">{customer.points}</td>
                  <td className="px-4 py-2 text-center text-sm">
                    {customer.lastVisitAt
                      ? new Date(customer.lastVisitAt).toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                        })
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
                          setNotice(null);
                          setFormDialog({ kind: "convert", customer });
                        }}
                      >
                        <Wallet className="mr-1 h-4 w-4" />
                        Convertir en pensionado
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
        <ClientFormDialog
          dialog={formDialog}
          onClose={() => setFormDialog(null)}
          onDone={(message) => {
            setNotice(message);
            setFormDialog(null);
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
  const isConvert = dialog.kind === "convert";
  const target = isEdit || isConvert ? dialog.customer : null;

  const [name, setName] = useState(target?.name ?? "");
  const [ci, setCi] = useState(target?.ci ?? "");
  const [phone, setPhone] = useState(target?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Para conversión a pensionado
  const [pensionType, setPensionType] = useState<"PREPAGO" | "POSTPAGO">("PREPAGO");
  const [creditLimit, setCreditLimit] = useState("");

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
      } else if (isConvert && target) {
        await convertToPensionado({
          customerId: target.id,
          pensionType,
          creditLimit: creditLimit ? parseInt(creditLimit, 10) : 0,
        });
        onDone(`Cliente "${name}" convertido a pensionado ${pensionType === "PREPAGO" ? "Prepago" : "Postpago"}.`);
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
        {isEdit ? `Editar ${target?.name}` : isConvert ? `Convertir a pensionado: ${target?.name}` : "Nuevo cliente"}
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

        {isConvert && (
          <>
            <div className="space-y-1">
              <Label htmlFor="c-type">Modalidad</Label>
              <select
                id="c-type"
                className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm [&>option]:bg-card [&>option]:text-foreground"
                value={pensionType}
                onChange={(e) => setPensionType(e.target.value as "PREPAGO" | "POSTPAGO")}
              >
                <option value="PREPAGO">Prepago (saldo a favor)</option>
                <option value="POSTPAGO">Postpago (crédito/deuda)</option>
              </select>
            </div>

            {pensionType === "POSTPAGO" && (
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
          </>
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
              : isConvert
              ? "Convertir a pensionado"
              : "Crear cliente"}
          </Button>
        </div>
      </form>
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