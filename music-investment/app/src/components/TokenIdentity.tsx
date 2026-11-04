"use client";
import registry from "../../public/tokens/registry.json";
import { useLanguage } from "@/context/LanguageContext";
type Deployment = { mint: string; supply: string; verifiedAt: string };
export default function TokenIdentity({ symbol }: { symbol: string }) {
  const { locale } = useLanguage();
  const token = registry.tokens.find((t) => t.symbol === symbol);
  const es = locale === "es";
  const mainnet = token?.mainnet as Deployment | null;
  const devnet = token?.devnet as Deployment | null;
  return (
    <details className="token-identity">
      <summary>
        {es ? "Identidad del token y red" : "Token identity & network"}
      </summary>
      <p>
        Solana · Token-2022 · {token?.decimals} {es ? "decimales" : "decimals"}
      </p>
      <p>
        <strong>Mainnet:</strong>{" "}
        {mainnet ? (
          <a
            href={`https://explorer.solana.com/address/${mainnet.mint}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {mainnet.mint}
          </a>
        ) : es ? (
          "Pendiente de emisión"
        ) : (
          "Issuance pending"
        )}
      </p>
      {devnet && (
        <p>
          <strong>Devnet ({es ? "prueba" : "test"}):</strong>{" "}
          <a
            href={`https://explorer.solana.com/address/${devnet.mint}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {devnet.mint}
          </a>
          <br />
          {es ? "Suministro verificado" : "Verified supply"}: {devnet.supply} ·{" "}
          {new Date(devnet.verifiedAt).toISOString().slice(0, 10)}
        </p>
      )}
      <p>
        {es
          ? "Sin activos de respaldo ni derechos económicos vigentes. Las autoridades de emisión, congelación y metadatos permanecen bajo control del emisor; no hay oferta abierta."
          : "No backing assets or active economic rights. Mint, freeze and metadata authorities remain issuer-controlled; there is no open offering."}
      </p>
    </details>
  );
}
