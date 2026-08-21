"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent } from "@bubba/ui";
import { useCartStore } from "@/lib/store/cart-store";

export function StartBuilderButton() {
  const router = useRouter();
  const setCustomerName = useCartStore((s) => s.setCustomerName);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleOpen() {
    setName("");
    setError(null);
    setOpen(true);
  }

  function handleClose() {
    setName("");
    setError(null);
    setOpen(false);
  }

  function handleConfirm() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Escribe tu nombre para continuar.");
      return;
    }
    setCustomerName(trimmed);
    router.push("/build");
  }

  return (
    <>
      <Button
        size="lg"
        className="mt-6 bg-white text-primary hover:bg-white/90"
        onClick={handleOpen}
      >
        Arma tu boba ahora
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Introduce tu nombre"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <Card className="w-full max-w-sm">
            <CardContent className="space-y-4 p-6">
              <div className="space-y-1 text-center">
                <h2 className="text-xl font-bold">¿Cuál es tu nombre?</h2>
                <p className="text-sm text-muted-foreground">
                  Lo usaremos para entregarte tu pedido cuando esté listo.
                </p>
              </div>
              <input
                autoFocus
                type="text"
                value={name}
                maxLength={40}
                placeholder="Ej. María Pérez"
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirm();
                  if (e.key === "Escape") handleClose();
                }}
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                >
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleConfirm}>
                  Continuar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
