import type { Metadata } from "next";
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
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
