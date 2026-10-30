"use client";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function Navbar() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <nav className="celer-nav">
      {/* Logo — left side */}
      <Link href="/" className="celer-brand">
        Music Solana
      </Link>

      {/* Navigation links — right side */}
      <div className="celer-links">
        <Link href="/" className="celer-link">
          {t.nav.projects}
        </Link>
        <Link href="/create" className="celer-link">
          {t.nav.createProject}
        </Link>
        <Link href="/portfolio" className="celer-link">
          {t.nav.myPortfolio}
        </Link>
        <button
          onClick={() => setLocale(locale === "en" ? "es" : "en")}
          className="celer-link celer-lang-btn"
          aria-label="Toggle language"
        >
          {locale === "en" ? "ES ▾" : "EN ▾"}
        </button>
      </div>
      <div className="celer-actions"><WalletMultiButton className="celer-wallet-btn" /></div>
    </nav>
  );
}
