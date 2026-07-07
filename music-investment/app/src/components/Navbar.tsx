"use client";
import { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function Navbar() {
  const { locale, setLocale, t } = useLanguage();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);
  const toggleLang = () => setLocale(locale === "en" ? "es" : "en");

  return (
    <nav className="celer-nav">
      {/* Logo — left side */}
      <Link href="/" className="celer-brand" onClick={close}>
        Musicsolana
      </Link>

      {/* Desktop navigation — right side */}
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
          onClick={toggleLang}
          className="celer-link celer-lang-btn"
          aria-label="Toggle language"
        >
          {locale === "en" ? "ES ▾" : "EN ▾"}
        </button>
        <WalletMultiButton className="celer-wallet-btn" />
      </div>

      {/* Mobile hamburger toggle */}
      <button
        className="celer-mobile-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle menu"
        aria-expanded={open}
      >
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile dropdown menu */}
      {open && (
        <div className="celer-mobile-menu">
          <Link href="/" className="celer-mobile-link" onClick={close}>
            HOME
          </Link>
          <Link href="/create" className="celer-mobile-link" onClick={close}>
            CREATE
          </Link>
          <Link href="/portfolio" className="celer-mobile-link" onClick={close}>
            PORTFOLIO
          </Link>
          <button
            onClick={toggleLang}
            className="celer-mobile-link celer-lang-btn"
            aria-label="Toggle language"
          >
            {locale === "en" ? "ESPAÑOL" : "ENGLISH"}
          </button>
          <div className="celer-mobile-wallet">
            <WalletMultiButton className="celer-wallet-btn" />
          </div>
        </div>
      )}
    </nav>
  );
}
