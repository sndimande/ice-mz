import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Índice do Comércio Externo de Moçambique",
  description: "Portal dos índices de exportação e importação de Moçambique.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body className="antialiased">{children}</body>
    </html>
  );
}
