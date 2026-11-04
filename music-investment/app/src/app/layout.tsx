import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "@/context/WalletContext";
import { LanguageProvider } from "@/context/LanguageContext";
import Navbar from "@/components/Navbar";
import { NetworkNotice, SiteFooter } from "@/components/SiteChrome";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://musicsolana.web.app"),
  title: {
    default: "Music Solana — Music Index & Artist Fund",
    template: "%s | Music Solana",
  },
  description:
    "MSIX y MSAF: dos estrategias para la economía musical en Solana. Acciones relacionadas con música y proyectos de artistas. Productos en preparación.",
  applicationName: "Music Solana",
  alternates: { canonical: "https://musicsolana.web.app/" },
  openGraph: {
    type: "website",
    url: "https://musicsolana.web.app/",
    siteName: "Music Solana",
    title: "Music Solana — Music Index & Artist Fund",
    description:
      "Two strategies for the music economy: MSIX Music Index and MSAF Artist Fund. Pre-launch products with transparent costs and risks.",
    images: ["/og-tokens.png"],
  },
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <LanguageProvider>
          <WalletContextProvider>
            <Navbar />
            <NetworkNotice />
            <main className="app-main">{children}</main>
            <SiteFooter />
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "#1A1A2E",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.08)",
                },
              }}
            />
          </WalletContextProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
