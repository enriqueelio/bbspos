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
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
