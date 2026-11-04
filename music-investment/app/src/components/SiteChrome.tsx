"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import operator from "../../public/legal/operator.json";
export function NetworkNotice() {
  const path = usePathname();
  const { locale } = useLanguage();
  if (path === "/" || path.startsWith("/disclosures")) return null;
  return (
    <div className="network-notice" role="note">
      <strong>
        {locale === "es"
          ? "Laboratorio devnet · Solo SOL de prueba. "
          : "Devnet lab · Test SOL only. "}
      </strong>
      {locale === "es"
        ? "Estas participaciones de proyectos son registros de prueba separados de MSIX y MSAF. No otorgan derechos musicales ni tienen valor monetario. Los proyectos incompletos no tienen reembolso automático."
        : "These project shares are test records separate from MSIX and MSAF. They grant no music rights and have no monetary value. Incomplete projects have no automatic refund."}
    </div>
  );
}
export function SiteFooter() {
  const { locale } = useLanguage();
  const es = locale === "es";
  return (
    <footer className="fund-footer">
      <div className="fund-container">
        <div className="footer-top">
          <Link href="/" className="footer-brand">
            Music Solana<span>◎</span>
          </Link>
          <div>
            <Link href="/disclosures/">
              {es ? "Transparencia y riesgos" : "Disclosures & risks"}
            </Link>
            <Link href="/explore/">
              {es ? "Laboratorio devnet" : "Devnet lab"}
            </Link>
            <a href={`mailto:${operator.contactEmail}`}>
              {es ? "Contacto" : "Contact"}
            </a>
          </div>
        </div>
        <p>
          {es
            ? "Rendimientos pasados no garantizan rendimientos futuros. Puedes perder todo el capital. MSIX y MSAF están en preparación; no aceptan inversiones reales ni tienen rentabilidad propia verificada."
            : "Past performance does not guarantee future results. You may lose all invested capital. MSIX and MSAF are in preparation; they do not accept real investments or have verified performance."}
        </p>
        <p className="footer-small">
          © {new Date().getFullYear()} {operator.legalName} · Music Solana · New
          Mexico, USA ·{" "}
          {es
            ? "La tecnología conecta. Los derechos dependen de contratos."
            : "Technology connects. Rights depend on contracts."}
        </p>
      </div>
    </footer>
  );
}
