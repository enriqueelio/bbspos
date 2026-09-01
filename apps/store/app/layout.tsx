import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { KioskTimeout } from "@/components/kiosk-timeout";
import { PwaInstallBanner } from "@/components/pwa-install-banner";

export const metadata: Metadata = {
  title: "Bubble Drink — Bubble Tea y bebidas con boba",
  description:
    "Arma tu bubble drink: elige tamaño, sabor y tipo de boba.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bubble Drink",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ea580c",
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
        <KioskTimeout />
        <PwaInstallBanner appName="Bubble Drink" />
      </body>
    </html>
  );
}
