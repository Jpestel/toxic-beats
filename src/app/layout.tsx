import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TOXIC | Beatmaker",
  description: "Beats RAP, Electro & plus — produits par TOXIC",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full flex flex-col bg-[#080808] text-neutral-200 antialiased">
        {children}
      </body>
    </html>
  );
}
