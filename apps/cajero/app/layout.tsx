import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bubba Cajero — Mostrador",
  description: "Pantalla del cajero: preparar, entregar y reporte del día.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="h-dvh overflow-hidden bg-slate-950 font-sans text-slate-50 antialiased">
        {children}
      </body>
    </html>
  );
}
