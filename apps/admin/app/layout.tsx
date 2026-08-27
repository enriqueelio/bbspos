import type { Metadata } from "next";
import { Toaster } from "@bubba/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bubba Admin — Panel del restaurante",
  description: "Panel de administración de Bubba Drinks.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
