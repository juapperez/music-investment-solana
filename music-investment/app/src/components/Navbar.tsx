"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
// The saved wallet selection exists only in the browser; avoid mismatched SSR markup.
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then(module => module.WalletMultiButton),
  { ssr: false },
);
export default function Navbar() {
  const { locale, setLocale, t } = useLanguage();
  const path = usePathname();
  const lab = path !== "/" && !path.startsWith("/disclosures");
  return (
    <nav
      className="celer-nav fund-nav"
      aria-label={locale === "es" ? "Navegación principal" : "Main navigation"}
    >
      <Link href="/" className="celer-brand">
        Music Solana<span className="brand-disc">◎</span>
      </Link>
      <div className="celer-links">
        {lab ? (
          <>
            <Link href="/explore/" className="celer-link">
              {t.nav.projects}
            </Link>
            <Link href="/create/" className="celer-link">
              {t.nav.createProject}
            </Link>
            <Link href="/portfolio/" className="celer-link">
              {t.nav.myPortfolio}
            </Link>
          </>
        ) : (
          <>
            <Link href="/#tokens" className="celer-link">
              Tokens
            </Link>
            <Link href="/#methodology" className="celer-link">
              {locale === "es" ? "Estrategia" : "Strategy"}
            </Link>
            <Link href="/#simulator" className="celer-link">
              {locale === "es" ? "Simulador" : "Simulator"}
            </Link>
            <Link href="/disclosures/" className="celer-link">
              {locale === "es" ? "Transparencia" : "Disclosures"}
            </Link>
          </>
        )}
        <button
          onClick={() => setLocale(locale === "en" ? "es" : "en")}
          className="celer-link celer-lang-btn"
          aria-label={
            locale === "es" ? "Switch to English" : "Cambiar a español"
          }
        >
          {locale === "en" ? "ES" : "EN"}
        </button>
      </div>
      <div className="celer-actions">
        {lab ? (
          <WalletMultiButton className="celer-wallet-btn" />
        ) : (
          <Link className="nav-lab" href="/explore/">
            {locale === "es" ? "Laboratorio" : "Devnet lab"} ↗
          </Link>
        )}
      </div>
    </nav>
  );
}
