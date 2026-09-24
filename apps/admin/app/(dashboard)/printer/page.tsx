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
  Label,
} from "@bbspos/ui";
import { FolderOpen, Loader2, Printer } from "lucide-react";

interface PrinterInfo {
  name: string;
  isWindowsDefault: boolean;
  workOffline: boolean;
}

interface PrinterSettings {
  driver: "windows" | "virtual-png";
  printerName: string | null;
  outputPath: string;
  paperWidthMm: number;
}

const DEFAULT_PNG_OUTPUT_DIR = "./tickets-output";

export default function PrinterPage() {
  const [loading, setLoading] = useState(true);
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [config, setConfig] = useState<PrinterSettings | null>(null);

  const [driver, setDriver] = useState<PrinterSettings["driver"]>("windows");
  const [selected, setSelected] = useState<string>("");
  const [outputPath, setOutputPath] = useState(DEFAULT_PNG_OUTPUT_DIR);
  const [paperWidthMm, setPaperWidthMm] = useState(80);

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
        config: PrinterSettings | null;
      };
      setPrinters(data.printers);
      setConfig(data.config);
      setDriver(data.config?.driver ?? (data.printers.length > 0 ? "windows" : "virtual-png"));
      setSelected(data.config?.printerName ?? data.printers[0]?.name ?? "");
      setOutputPath(data.config?.outputPath ?? DEFAULT_PNG_OUTPUT_DIR);
      setPaperWidthMm(data.config?.paperWidthMm ?? 80);
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

  const canSave =
    driver === "windows"
      ? Boolean(selected)
      : Boolean(outputPath.trim());

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setMessage(null);
    try {
      const body: Record<string, unknown> = { driver };
      if (driver === "windows") {
        body.printerName = selected;
      } else {
        body.outputPath = outputPath.trim() || DEFAULT_PNG_OUTPUT_DIR;
        body.paperWidthMm = paperWidthMm;
      }
      const res = await fetch("/api/printer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        config?: PrinterSettings;
        error?: string;
      };
      if (!res.ok || !data.config) {
        throw new Error(data.error ?? "Error al guardar.");
      }
      setConfig(data.config);
      setMessage({
        ok: true,
        text:
          driver === "virtual-png"
            ? `Comandas como PNG en "${data.config.outputPath}".`
            : `Comandas configuradas en "${data.config.printerName}".`,
      });
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
    if (!canSave) return;
    setTesting(true);
    setMessage(null);
    try {
      const body: Record<string, unknown> = { driver };
      if (driver === "windows") {
        body.printerName = selected;
      } else {
        body.outputPath = outputPath.trim() || DEFAULT_PNG_OUTPUT_DIR;
        body.paperWidthMm = paperWidthMm;
      }
      const res = await fetch("/api/printer/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  return (
    <div className="space-y-6">
      <div className="mb-6 border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-white">Impresora de comandas</h1>
        <p className="text-sm text-muted-foreground">
          Elige dónde se imprimirán las comandas cuando un cliente confirma un
          pedido: una impresora de esta computadora (o compartida por la red), o
          la impresora térmica virtual que guarda cada ticket como imagen PNG
          para pruebas y auditoría visual sin una térmica conectada.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Destino de las comandas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Leyendo impresoras instaladas...
            </div>
          ) : (
            <>
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-medium">Tipo de impresora</p>
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="driver"
                    value="windows"
                    checked={driver === "windows"}
                    onChange={() => setDriver("windows")}
                    className="h-4 w-4"
                  />
                  <span className="font-medium">Impresora de Windows</span>
                  <span className="text-xs text-muted-foreground">
                    Física (térmica) o impresora virtual tipo PDF
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="driver"
                    value="virtual-png"
                    checked={driver === "virtual-png"}
                    onChange={() => setDriver("virtual-png")}
                    className="h-4 w-4"
                  />
                  <span className="font-medium">
                    Impresora Térmica Virtual PNG
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Guarda cada comanda como imagen PNG (desarrollo/auditoría)
                  </span>
                </label>
              </div>

              {driver === "windows" ? (
                printers.length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">
                    No se encontraron impresoras instaladas en Windows en esta
                    computadora. Instala la térmica (o cualquier impresora) y
                    vuelve a cargar, o usa la Impresora Térmica Virtual PNG.
                  </p>
                ) : (
                  <div className="space-y-4">
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
                            {config?.driver === "windows" &&
                              config.printerName === printer.name && (
                                <Badge>Comandas</Badge>
                              )}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                <div className="space-y-3 rounded-lg border border-dashed p-3">
                  <p className="text-sm font-medium">
                    Carpeta donde se guardan los tickets
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ruta donde se escribirán los PNG de cada comanda (ticket
                    visible + fecha, ej. <code>ticket-00008-2026-09-24.png</code>).
                    Si es relativa se resuelve desde la raíz del proyecto.
                  </p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="output-path" className="text-xs">
                        Carpeta de salida
                      </Label>
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id="output-path"
                          value={outputPath}
                          onChange={(e) => setOutputPath(e.target.value)}
                          placeholder={DEFAULT_PNG_OUTPUT_DIR}
                          className="w-72"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="paper-width" className="text-xs">
                        Ancho del rollo
                      </Label>
                      <select
                        id="paper-width"
                        value={paperWidthMm}
                        onChange={(e) => setPaperWidthMm(Number(e.target.value))}
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value={80}>80 mm</option>
                        <option value={58}>58 mm</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleSave} disabled={saving || !canSave}>
                  {saving ? "Guardando..." : "Guardar selección"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTest}
                  disabled={testing || !canSave}
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