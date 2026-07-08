"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const GITHUB_URL = "https://github.com/juapperez/music-investment-solana";
const EXPLORER_URL = "https://explorer.solana.com/?cluster=devnet";

export default function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">Musicsolana</div>
          <p className="footer-tagline">{t.footer.tagline}</p>
          <div className="footer-network">
            <span className="live-dot" />
            {t.footer.network}
          </div>
        </div>

        <div className="footer-col">
          <h4 className="footer-col-title">{t.footer.product}</h4>
          <Link href="/" className="footer-link">
            {t.footer.home}
          </Link>
          <Link href="/create" className="footer-link">
            {t.footer.create}
          </Link>
          <Link href="/portfolio" className="footer-link">
            {t.footer.portfolio}
          </Link>
        </div>

        <div className="footer-col">
          <h4 className="footer-col-title">{t.footer.resources}</h4>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="footer-link">
            {t.footer.github} <ArrowUpRight size={13} />
          </a>
          <a href={EXPLORER_URL} target="_blank" rel="noopener noreferrer" className="footer-link">
            {t.footer.explorer} <ArrowUpRight size={13} />
          </a>
        </div>
      </div>

      <div className="footer-bottom">
        <span>
          © {year} Musicsolana. {t.footer.rights}
        </span>
        <span className="footer-built">{t.footer.builtOn}</span>
      </div>
    </footer>
  );
}
