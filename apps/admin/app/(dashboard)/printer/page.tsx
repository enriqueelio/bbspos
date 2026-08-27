"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
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
  const [uncPath, setUncPath] = useState("");
  const [connecting, setConnecting] = useState(false);
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
        text: "No se pudo leer la lista de impresoras de esta computadora.",
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

  async function handleConnect() {
    const path = uncPath.trim();
    if (!path) return;
    setConnecting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/printer/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uncPath: path }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo conectar.");
      setMessage({
        ok: true,
        text: `Impresora "${path}" conectada. Ya aparece en la lista.`,
      });
      setUncPath("");
      await load();
    } catch (e) {
      setMessage({
        ok: false,
        text: e instanceof Error ? e.message : "No se pudo conectar.",
      });
    } finally {
      setConnecting(false);
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
      <div className="mb-6 border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-white">Impresora de comandas</h1>
        <p className="text-sm text-muted-foreground">
          Elige la impresora de esta computadora (o una compartida desde otro
          equipo de la red) donde se imprimirán las comandas cuando un cliente
          confirma un pedido.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Impresoras de esta computadora
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
              No se encontraron impresoras instaladas en Windows en esta
              computadora. Instala la térmica (o cualquier impresora) y vuelve
              a cargar.
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

          <div className="space-y-2 rounded-lg border border-dashed p-3">
            <p className="text-sm font-medium">
              Impresora conectada a otra computadora
            </p>
            <p className="text-xs text-muted-foreground">
              Si la térmica está enchufada a otro equipo, compártela ahí
              (Panel de control → Dispositivos e impresoras → clic derecho →
              Propiedades de la impresora → Compartir) y conéctala aquí con su
              ruta de red, ej.: <code>\\CAJA\POS-80</code>.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={uncPath}
                onChange={(e) => setUncPath(e.target.value)}
                placeholder="\\EQUIPO\Impresora"
                className="max-w-xs"
              />
              <Button
                variant="outline"
                onClick={handleConnect}
                disabled={connecting || !uncPath.trim()}
              >
                {connecting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Conectar impresora de red
              </Button>
            </div>
          </div>

          {message && (
            <p
              className={
                message.ok
                  ? "text-sm font-medium text-success"
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
