import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Bubble Drink â€” Bubble Tea y bebidas con boba",
  description:
    "Arma tu bubble drink: elige tamaÃ±o, sabor y tipo de boba.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6">
          {children}
        </main>
      </body>
    </html>
  );
}
