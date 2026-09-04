import type { Metadata } from "next";
import { Toaster } from "@bbspos/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "BBSPOS Admin — Panel del restaurante",
  description: "Panel de administración de BBSPOS Drinks.",
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
