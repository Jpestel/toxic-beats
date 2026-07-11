import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "TOXIC | Beatmaker",
  description: "Beats RAP, Electro & plus — produits par TOXIC",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const umamiId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full flex flex-col bg-[#080808] text-neutral-200 antialiased">
        {children}
        {umamiId && (
          <Script
            defer
            src="https://stats.toxic-files.com/script.js"
            data-website-id={umamiId}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
