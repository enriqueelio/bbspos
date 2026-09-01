"use client";

import { useState, useEffect } from "react";

const DISMISS_KEY = "pwa-install-dismissed";

export function PwaInstallBanner({ appName }: { appName: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari exposes navigator.standalone when added to home screen
      ((): boolean => {
        try {
          return (navigator as Navigator & { standalone?: boolean }).standalone === true;
        } catch {
          return false;
        }
      })();

    if (isStandalone) return;

    const isLocalhost =
      location.hostname === "localhost" || location.hostname === "127.0.0.1";

    if (isLocalhost) return;

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) return;

    setShow(true);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-slate-900/95 px-4 py-3 text-sm text-slate-200 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-start gap-3">
        <div className="flex-1">
          <p className="font-semibold text-white">
            Instalar {appName} en tu tablet
          </p>
          <ol className="mt-1 list-inside list-decimal space-y-1 text-slate-400">
            <li>
              Toca el{" "}
              <span className="font-mono text-slate-300">menú ⋯</span> en la
              barra de direcciones.
            </li>
            <li>
              Selecciona{" "}
              <span className="font-medium text-slate-200">
                &quot;Agregar a la pantalla de inicio&quot;
              </span>
              .
            </li>
            <li>
              Confirma y toca{" "}
              <span className="font-medium text-slate-200">&quot;Agregar&quot;</span>.
            </li>
          </ol>
          <p className="mt-2 text-xs text-slate-500">
            La app se abrirá sin barra de direcciones, como una app nativa.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="mt-1 shrink-0 rounded-md px-3 py-1 text-xs font-medium text-slate-400 hover:bg-white/10 hover:text-white"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
