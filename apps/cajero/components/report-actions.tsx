"use client";

import { useEffect, useTransition, useState } from "react";
import { Printer, FileDown, Send } from "lucide-react";
import { Button } from "@bubba/ui";
import { MANUAL_REPORT_CUTOFF, MANUAL_REPORT_CUTOFF_MINUTES, zonedClockMinutes } from "@bubba/types";
import { printDailyReport } from "@/app/actions/printing";
import { sendDailyReportToBot } from "@/app/actions/report";

export function ReportActions() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [telegramPending, startTelegram] = useTransition();
  const [telegramMessage, setTelegramMessage] = useState<string | null>(null);
  const [clockNow, setClockNow] = useState(() => Date.now());

  // Habilita el botón solo a partir de las 23:10 (reloj del negocio).
  useEffect(() => {
    const timer = setInterval(() => setClockNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const canSendTelegram =
    zonedClockMinutes(new Date(clockNow)) >= MANUAL_REPORT_CUTOFF_MINUTES;

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

  function handleSendToTelegram() {
    setTelegramMessage(null);
    startTelegram(async () => {
      try {
        const msg = await sendDailyReportToBot();
        setTelegramMessage(msg);
      } catch (e) {
        setTelegramMessage(
          e instanceof Error ? e.message : "No se pudo enviar el reporte.",
        );
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" disabled={pending} onClick={handlePrint}>
        <Printer className="mr-1 h-4 w-4" /> {pending ? "Imprimiendo..." : "Imprimir"}
      </Button>
      <Button variant="outline" size="sm" onClick={handlePdf}>
        <FileDown className="mr-1 h-4 w-4" /> Guardar PDF
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={telegramPending || !canSendTelegram}
        onClick={handleSendToTelegram}
        title={
          canSendTelegram
            ? undefined
            : `Disponible a partir de las ${MANUAL_REPORT_CUTOFF}`
        }
      >
        <Send className="mr-1 h-4 w-4" />{" "}
        {telegramPending ? "Enviando..." : "Enviar a Telegram"}
      </Button>
      {!canSendTelegram && (
        <span className="text-sm text-muted-foreground">
          Disponible a partir de las {MANUAL_REPORT_CUTOFF}.
        </span>
      )}
      {message && <span className="text-sm text-primary">{message}</span>}
      {telegramMessage && (
        <span className="text-sm text-primary">{telegramMessage}</span>
      )}
    </div>
  );
}
