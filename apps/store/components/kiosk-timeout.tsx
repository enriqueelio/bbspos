"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@bbspos/ui";
import { useCartStore } from "@/lib/store/cart-store";

const INACTIVITY_MS = 45_000;
const WARNING_MS = 10_000;
const EVENTS: (keyof WindowEventMap)[] = ["touchstart", "click", "scroll"];

/** Rutas donde el temporizador de inactividad está activo (flujo de pedido). */
const ACTIVE_PATHS = ["/build", "/cart"];

/** ¿Está el kiosco dentro del flujo de pedido? */
function isActivePath(pathname: string): boolean {
  return ACTIVE_PATHS.some((p) => pathname === p || pathname?.startsWith(p + "/"));
}

export function KioskTimeout() {
  const router = useRouter();
  const pathname = usePathname();
  const clearCart = useCartStore((s) => s.clear);
  const [showWarning, setShowWarning] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loggingOut = useRef(false);

  const showWarningRef = useRef(false);
  function setWarning(open: boolean) {
    showWarningRef.current = open;
    setShowWarning(open);
  }

  const stopTimers = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    idleTimer.current = null;
    warningTimer.current = null;
  }, []);

  const reset = useCallback(() => {
    if (loggingOut.current) return;
    // En la página de inicio no se cuenta inactividad ni se redirige.
    if (!isActivePath(pathname)) {
      setWarning(false);
      stopTimers();
      return;
    }
    setWarning(false);
    stopTimers();

    idleTimer.current = setTimeout(() => {
      setWarning(true);
      warningTimer.current = setTimeout(() => {
        loggingOut.current = true;
        setWarning(false);
        stopTimers();
        clearCart();
        router.replace("/");
      }, WARNING_MS);
    }, INACTIVITY_MS);
  }, [stopTimers, clearCart, router, pathname]);

  useEffect(() => {
    function resetOnEvent() {
      reset();
    }

    EVENTS.forEach((event) =>
      window.addEventListener(event, resetOnEvent, { passive: true }),
    );

    reset();

    return () => {
      EVENTS.forEach((event) =>
        window.removeEventListener(event, resetOnEvent),
      );
      stopTimers();
      loggingOut.current = false;
    };
  }, [reset, stopTimers]);

  function handleClose() {
    setWarning(false);
    stopTimers();
    idleTimer.current = setTimeout(reset, 0);
  }

  return (
    <Dialog
      open={showWarning}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle>Tu sesión se cerrará en 10 segundos...</DialogTitle>
          <DialogDescription>
            Si no hay actividad, se vaciará tu carrito y volverás al inicio.
          </DialogDescription>
        </DialogHeader>
        <Button
          size="lg"
          className="h-16 w-full text-xl font-extrabold"
          onClick={handleClose}
        >
          Seguir aquí
        </Button>
      </DialogContent>
    </Dialog>
  );
}
