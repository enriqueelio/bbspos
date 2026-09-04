"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@bbspos/ui";
import { getPaymentQr, removePaymentQr, savePaymentQr } from "@/app/actions/payment";

export function PaymentsClient({
  initialQr,
}: {
  initialQr: { qrImage: string; mimeType: string } | null;
}) {
  const [qr, setQr] = useState<{ qrImage: string; mimeType: string } | null>(
    initialQr,
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setError(null);
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function handleSave() {
    if (!file) {
      setError("Selecciona una imagen.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("qrImage", file);
      await savePaymentQr(formData);
      const fresh = await getPaymentQr();
      setQr(fresh);
      if (preview) URL.revokeObjectURL(preview);
      setFile(null);
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    setError(null);
    try {
      await removePaymentQr();
      setQr(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error.");
    } finally {
      setBusy(false);
    }
  }

  const imageSrc = preview ?? qr?.qrImage ?? null;

  return (
    <div className="space-y-6">
      <div className="mb-6 border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-white">Pagos</h1>
        <p className="text-muted-foreground">
          Sube el código QR de tu cuenta de pago. Se mostrará al cliente al
          confirmar su pedido.
        </p>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>QR de pago</CardTitle>
          <CardDescription>
            Imagen JPG o PNG desde tu galería, máximo 2 MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            {imageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageSrc}
                alt="QR de pago"
                className="h-48 w-48 rounded-lg border bg-white object-contain p-2"
              />
            ) : (
              <div className="flex h-48 w-48 items-center justify-center rounded-lg border text-center text-sm text-muted-foreground">
                Sin QR configurado
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="qr-file">Imagen desde tu galería</Label>
            <Input
              id="qr-file"
              type="file"
              accept="image/*"
              onChange={handleFile}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={busy || !file}>
              {busy ? "Guardando..." : "Guardar QR"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={busy || !qr}
            >
              Eliminar QR
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
