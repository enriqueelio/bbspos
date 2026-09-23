"use client";

import { useEffect, useRef } from "react";

interface UsePosKeyboardParams {
  /** Paneles de la barra de categorías, en el orden visual (teclas 1-9). */
  panes: { key: string }[];
  switchPane: (key: string) => void;
  /** Dispara el cobro con Enter cuando el ticket tiene productos. */
  submit: () => void;
  hasItems: boolean;
  busy: boolean;
}

/** Atajos de teclado del POS (flujo rápido tipo Square): teclas 1-9
 *  seleccionan la categoría de la barra por índice y Enter dispara el cobro.
 *  Se ignoran si el foco está en un campo de texto (buscar producto / nombre de
 *  cliente) para no chocar con la escritura. Las refs evitan re-enganchar el
 *  listener en cada render. */
export function usePosKeyboard({
  panes,
  switchPane,
  submit,
  hasItems,
  busy,
}: UsePosKeyboardParams) {
  const panesRef = useRef(panes);
  panesRef.current = panes;
  const switchPaneRef = useRef(switchPane);
  switchPaneRef.current = switchPane;
  const submitRef = useRef(submit);
  submitRef.current = submit;
  const hasItemsRef = useRef(hasItems);
  hasItemsRef.current = hasItems;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;

      if (e.key >= "1" && e.key <= "9") {
        const pane = panesRef.current[Number(e.key) - 1];
        if (pane) {
          e.preventDefault();
          switchPaneRef.current(pane.key);
        }
        return;
      }

      if (e.key === "Enter" && hasItemsRef.current && !busyRef.current) {
        e.preventDefault();
        void submitRef.current();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}