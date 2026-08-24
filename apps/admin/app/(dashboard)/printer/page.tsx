"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@bubba/ui";
import { Loader2, Printer } from "lucide-react";

interface PrinterInfo {
  name: string;
  isWindowsDefault: boolean;
  workOffline: boolean;
}

export default function PrinterPage() {
  const [loading, setLoading] = useState(true);
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [configured, setConfigured] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/printer");
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        printers: PrinterInfo[];
        configured: string | null;
      };
      setPrinters(data.printers);
      setConfigured(data.configured);
      setSelected(data.configured ?? data.printers[0]?.name ?? "");
    } catch {
      setMessage({
        ok: false,
        text: "No se pudo leer la lista de impresoras del servidor.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/printer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printerName: selected }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error al guardar.");
      setConfigured(selected);
      setMessage({ ok: true, text: `Comandas configuradas en "${selected}".` });
    } catch (e) {
      setMessage({
        ok: false,
        text: e instanceof Error ? e.message : "Error al guardar.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!selected) return;
    setTesting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/printer/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printerName: selected }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      setMessage({
        ok: Boolean(data.ok),
        text:
          data.message ??
          data.error ??
          (res.ok
            ? "Prueba enviada."
            : "No se pudo probar la impresora."),
      });
    } catch {
      setMessage({ ok: false, text: "No se pudo probar la impresora." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Impresora de comandas</h1>
        <p className="text-sm text-muted-foreground">
          Elige la impresora instalada en el servidor donde se imprimen las
          comandas cuando un cliente confirma un pedido.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Impresoras del servidor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Leyendo impresoras instaladas...
            </div>
          ) : printers.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No se encontraron impresoras instaladas en Windows. Instala la
              térmica (o cualquier impresora) en el servidor y vuelve a cargar.
            </p>
          ) : (
            <>
              <div className="divide-y rounded-lg border">
                {printers.map((printer) => (
                  <label
                    key={printer.name}
                    className="flex cursor-pointer items-center justify-between gap-3 p-3 hover:bg-accent/50"
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="printer"
                        value={printer.name}
                        checked={selected === printer.name}
                        onChange={() => setSelected(printer.name)}
                        className="h-4 w-4"
                      />
                      <span className="font-medium">{printer.name}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      {printer.workOffline && (
                        <Badge variant="destructive">Sin conexión</Badge>
                      )}
                      {printer.isWindowsDefault && (
                        <Badge variant="secondary">Predeterminada</Badge>
                      )}
                      {configured === printer.name && (
                        <Badge>Comandas</Badge>
                      )}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleSave} disabled={saving || !selected}>
                  {saving ? "Guardando..." : "Guardar selección"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTest}
                  disabled={testing || !selected}
                >
                  {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Probar impresión
                </Button>
              </div>
            </>
          )}

          {message && (
            <p
              className={
                message.ok
                  ? "text-sm font-medium text-emerald-600"
                  : "text-sm font-medium text-destructive"
              }
            >
              {message.text}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
