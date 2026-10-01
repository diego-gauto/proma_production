import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Proma Production",
  description: "Sistema de seguimiento de produccion textil",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
