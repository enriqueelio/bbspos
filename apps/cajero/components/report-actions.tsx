"use client";

import { useTransition, useState } from "react";
import { Printer, FileDown } from "lucide-react";
import { Button } from "@bubba/ui";
import { printDailyReport } from "@/app/actions/printing";

export function ReportActions() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handlePrint() {
    setMessage(null);
    startTransition(async () => {
      try {
        const msg = await printDailyReport();
        setMessage(msg);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "No se pudo imprimir.");
      }
    });
  }

  function handlePdf() {
    window.print();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" disabled={pending} onClick={handlePrint}>
        <Printer className="mr-1 h-4 w-4" /> {pending ? "Imprimiendo..." : "Imprimir"}
      </Button>
      <Button variant="outline" size="sm" onClick={handlePdf}>
        <FileDown className="mr-1 h-4 w-4" /> Guardar PDF
      </Button>
      {message && <span className="text-sm text-primary">{message}</span>}
    </div>
  );
}
