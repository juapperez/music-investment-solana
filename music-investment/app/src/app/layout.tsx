import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "@/context/WalletContext";
import { LanguageProvider } from "@/context/LanguageContext";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://musicsolana.web.app'),
  title: { default: 'Music Solana — Music funding on devnet', template: '%s | Music Solana' },
  description: 'Explore music project funding and revenue sharing on Solana devnet with test SOL. Create projects, back artists and track on-chain deposits.',
  applicationName: 'Music Solana',
  alternates: { canonical: 'https://musicsolana.web.app/' },
  openGraph: { type: 'website', url: 'https://musicsolana.web.app/', siteName: 'Music Solana', title: 'Music Solana — Music funding on devnet', description: 'A test environment for artist funding and on-chain revenue sharing. Test SOL only.', images: ['/og-image.png'] },
  icons: { icon: '/favicon.svg', apple: '/apple-touch-icon.png' },
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LanguageProvider>
        <WalletContextProvider>
          <Navbar />
          <div className="network-notice" role="note"><strong>Devnet preview · Test SOL only.</strong> Project shares are on-chain records, not tradable tokens or legal ownership of music rights.</div>
          <main className="app-main">{children}</main>
          <footer className="site-footer"><p>Music Solana · Artist funding experiments on Solana.</p><p>Revenue is deposited by the artist; this app does not collect royalties from streaming services.</p><a href="https://pdevelop.net/apps/">Explore our music apps</a> · <a href="mailto:contact@pdevelop.net">Support</a></footer>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: { background: "#1A1A2E", color: "#fff", border: "1px solid rgba(255,255,255,0.08)" },
            }}
          />
        </WalletContextProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
