import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "@/context/WalletContext";
import { LanguageProvider } from "@/context/LanguageContext";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://musicsolana.app'),
  title: {
    default: "Musicsolana — Music Investment on Solana | Decentralized Music Funding",
    template: "%s | Musicsolana"
  },
  description: "Revolutionary music investment platform on Solana blockchain. Artists raise funds by selling shares, investors earn transparent revenue share. Fast, secure, and fully on-chain. Built for Solana LATAM Hackathon.",
  keywords: [
    "Solana",
    "Solana music",
    "music investment",
    "blockchain music",
    "DeFi music",
    "revenue share",
    "music funding",
    "crypto investment",
    "Web3 music",
    "Solana devnet",
    "music NFT",
    "decentralized music",
    "artist funding",
    "crowdfunding music",
    "Anchor framework",
    "Solana dApp",
    "music royalties",
    "blockchain crowdfunding",
    "Solana LATAM",
    "music DAO",
    "tokenized music",
    "music shares"
  ],
  authors: [{ name: "Musicsolana Team" }],
  creator: "Musicsolana",
  publisher: "Musicsolana",
  applicationName: "Musicsolana",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "https://musicsolana.app",
    languages: {
      "en-US": "https://musicsolana.app/en",
      "es-ES": "https://musicsolana.app/es"
    }
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["es_ES"],
    url: "https://musicsolana.app",
    siteName: "Musicsolana",
    title: "Musicsolana — Music Investment on Solana | Decentralized Music Funding",
    description: "Revolutionary music investment platform on Solana. Artists raise funds by selling shares, investors earn transparent revenue share. Fast, secure, fully on-chain. Built with Anchor framework.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Musicsolana - Decentralized Music Investment Platform on Solana Blockchain",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Musicsolana — Music Investment on Solana",
    description: "Revolutionary music investment platform. Artists raise funds, investors earn revenue share. Built on Solana blockchain.",
    images: ["/og-image.png"],
    creator: "@musicsolana",
    site: "@musicsolana"
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/favicon.svg",
      }
    ]
  },
  manifest: "/manifest.json",
  category: "technology",
  classification: "Blockchain, Music, DeFi, Investment Platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LanguageProvider>
        <WalletContextProvider>
          <Navbar />
          <main className="app-main">{children}</main>
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
