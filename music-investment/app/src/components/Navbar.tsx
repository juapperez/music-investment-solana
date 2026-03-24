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
        Musicsolana
      </Link>

      {/* Navigation links — right side */}
      <div className="celer-links">
        <Link href="/" className="celer-link">
          HOME
        </Link>
        <Link href="/create" className="celer-link">
          CREATE
        </Link>
        <Link href="/portfolio" className="celer-link">
          PORTFOLIO
        </Link>
        <button
          onClick={() => setLocale(locale === "en" ? "es" : "en")}
          className="celer-link celer-lang-btn"
          aria-label="Toggle language"
        >
          {locale === "en" ? "ES ▾" : "EN ▾"}
        </button>
        <WalletMultiButton className="celer-wallet-btn" />
      </div>
    </nav>
  );
}
