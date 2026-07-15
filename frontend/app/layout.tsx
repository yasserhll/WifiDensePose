import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WiFi DensePose — Chambre Intelligente",
  description: "Estimation de pose humaine via signaux WiFi (CSI) — Smart Room",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="antialiased min-h-screen bg-surface">{children}</body>
    </html>
  );
}
