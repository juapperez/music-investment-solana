"use client";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import TokenIdentity from "@/components/TokenIdentity";
export default function DisclosuresPage() {
  const { locale } = useLanguage();
  const c = (a: string, b: string) => (locale === "es" ? a : b);
  return (
    <div className="fund-container disclosures-page">
      <span className="eyebrow">
        MUSIC SOLANA · {c("ACTUALIZADO 04 NOV 2026", "UPDATED NOV 04, 2026")}
      </span>
      <h1>{c("Transparencia y riesgos", "Disclosures & risks")}</h1>
      <p>
        {c(
          "MSIX (Music Solana Index) y MSAF (Music Solana Artist Fund) son dos productos en preparación. Esta página describe su diseño y el estado real de lanzamiento.",
          "MSIX (Music Solana Index) and MSAF (Music Solana Artist Fund) are two products in preparation. This page describes their design and actual launch status.",
        )}
      </p>
      <div className="disclosure-callout">
        <p>
          <strong>
            {c(
              "No se aceptan inversiones reales.",
              "Real investments are not accepted.",
            )}
          </strong>{" "}
          {c(
            "No hay precio de suscripción, NAV, activos custodiados ni derechos económicos acreditados. La existencia de un token no crea respaldo, derechos musicales o participación societaria.",
            "There is no subscription price, NAV, custodied assets or evidenced economic rights. A token’s existence does not create backing, music rights or equity ownership.",
          )}
        </p>
      </div>
      <h2>{c("Estado de lanzamiento", "Launch status")}</h2>
      <table className="launch-table">
        <thead>
          <tr>
            <th>{c("Componente", "Component")}</th>
            <th>{c("Estado", "Status")}</th>
          </tr>
        </thead>
        <tbody>
          {[
            [
              c("Web y simulador", "Website & calculator"),
              c(
                "Disponibles; cálculos ilustrativos",
                "Available; illustrative calculations",
              ),
            ],
            [
              c("Tokens y direcciones de red", "Tokens & network addresses"),
              c(
                "Consultar identidades verificadas abajo; mainnet pendiente",
                "See verified identities below; mainnet pending",
              ),
            ],
            [
              c(
                "Entidad operadora y jurisdicción",
                "Operating entity & jurisdiction",
              ),
              c("Pendientes de confirmación", "Awaiting confirmation"),
            ],
            [
              c(
                "MSIX: proveedor, custodia, posiciones y NAV",
                "MSIX: provider, custody, holdings & NAV",
              ),
              c(
                "No establecidos; ninguna compra integrada",
                "Not established; no purchase integration",
              ),
            ],
            [
              c(
                "MSAF: contratos, activos y derechos de artistas",
                "MSAF: contracts, assets & artist rights",
              ),
              c(
                "No acreditados; ningún contrato incorporado",
                "Not evidenced; no contracts onboarded",
              ),
            ],
            [
              c(
                "Suscripciones, reembolsos y distribuciones",
                "Subscriptions, redemptions & distributions",
              ),
              c("No habilitados para los tokens", "Not enabled for the tokens"),
            ],
            [
              c(
                "Revisión independiente para dinero real",
                "Independent review for real funds",
              ),
              c("No completada", "Not completed"),
            ],
          ].map(([a, b]) => (
            <tr key={a}>
              <td>{a}</td>
              <td>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>{c("Identidad de los dos tokens", "Identity of both tokens")}</h2>
      <TokenIdentity symbol="MSIX" />
      <TokenIdentity symbol="MSAF" />
      <p>
        {c(
          "Las autoridades de emisión, congelación y actualización de metadatos se conservan bajo control del emisor. Las cuentas de los tokens se crean congeladas por defecto. Esto no sustituye contratos, controles de elegibilidad ni una custodia adecuada. No hay suministro vendido ni mercado secundario habilitado.",
          "Mint, freeze and metadata update authorities remain issuer-controlled. Token accounts start frozen by default. This does not replace contracts, eligibility controls or proper custody. No supply has been sold and no secondary market is enabled.",
        )}
      </p>
      <h2>
        {c(
          "Qué significa el rendimiento mostrado",
          "What the displayed returns mean",
        )}
      </h2>
      <p>
        {c(
          "MSIX no ofrece un APY fijo. El retorno total de una cesta considera variación de precios y los dividendos que correspondan al instrumento. El resultado neto descuenta compra, red, indexación y rebalanceo. Deben evitarse los dividendos duplicados cuando ya están incluidos en una serie de retorno total.",
          "MSIX does not offer a fixed APY. Basket total return accounts for price changes and dividends applicable to the instrument. Net performance deducts purchase, network, indexing and rebalancing costs. Dividends must not be double counted when included in total return data.",
        )}
      </p>
      <p>
        {c(
          "El 8 % bruto anual de MSAF es exclusivamente un supuesto para explorar costes, elegido para el simulador. No es una proyección respaldada por contratos, una media del mercado, un APY ni un historial del fondo. El horizonte de 3–5 años es propuesto; no existe un compromiso de rescate en esas fechas.",
          "MSAF’s 8% annual gross return is solely a cost-exploration assumption chosen for the calculator. It is not a contract-backed projection, market average, APY or fund track record. The 3–5 year horizon is proposed; no redemption commitment exists for those dates.",
        )}
      </p>
      <p>
        {c(
          "Todas las comisiones del simulador son supuestos editables, no tarifas aprobadas. Se modela un año en USD, con compra y red descontadas al inicio, gestión y rebalanceo sobre el capital inicialmente invertido, sin reinversión de distribuciones. Se excluyen impuestos, costes de salida y efectos cambiarios. El resultado se limita a pérdida total del capital, sin deuda adicional.",
          "All calculator fees are editable assumptions, not approved charges. The model covers one year in USD, deducting purchase and network costs at entry and management and rebalancing on starting invested capital, without reinvesting distributions. Taxes, exit costs and currency effects are excluded. Loss is capped at all invested capital without additional debt.",
        )}
      </p>
      <h2>{c("Fuentes y sus límites", "Sources & limitations")}</h2>
      <ul>
        <li>
          <a
            href="/market/msix-history.json"
            target="_blank"
            rel="noopener noreferrer"
          >
            Yahoo Finance · SPOT / AAPL / AMZN / GOOGL
          </a>
          :{" "}
          {c(
            "cierres ajustados del 03/11/2025 al 03/11/2026. El JSON publica precios, pesos, retornos y URLs de origen. La cesta hipotética mantiene pesos iniciales 40/20/20/20 durante el periodo y no incluye costes ni rebalanceo. Sus resultados no son el historial de MSIX. El simulador usa los retornos anualizados individuales como escenario editable; los instrumentos tokenizados pueden diferir de sus acciones subyacentes.",
            "adjusted closes from 2025-11-03 to 2026-11-03. The JSON publishes prices, weights, returns and source URLs. The hypothetical basket holds initial weights of 40/20/20/20 through the period without costs or rebalancing. Its results are not MSIX’s track record. The calculator uses individual annualized returns as an editable scenario; tokenized instruments may differ from underlying shares.",
          )}
        </li>
        <li>
          <a
            href="https://www.musqetf.com/musq"
            target="_blank"
            rel="noopener noreferrer"
          >
            MUSQ ETF · Fund Summary
          </a>
          :{" "}
          {c(
            "−9,73 % de retorno del NAV a un año al 31/07/2026. Es un ETF externo, con cartera y comisiones distintas. No es el retorno de MSIX.",
            "−9.73% one-year NAV return as of 2026-07-31. This external ETF has different holdings and fees. It is not MSIX performance.",
          )}
        </li>
        <li>
          <a
            href="https://www.rns-pdf.londonstockexchange.com/rns/3519X_1-2023-4-25.pdf#page=6"
            target="_blank"
            rel="noopener noreferrer"
          >
            Round Hill Music Royalty Fund · Annual Report 2022, p. 4
          </a>
          :{" "}
          {c(
            "objetivo a medio plazo de retorno neto anual de 9–11 %, no resultado obtenido. Se refiere a catálogos maduros; no puede extrapolarse a artistas nuevos ni sustenta el supuesto de MSAF.",
            "a medium-term net annual return target of 9–11%, not a realized result. It concerns mature catalogues and cannot be extrapolated to new artists or substantiate the MSAF assumption.",
          )}
        </li>
        <li>
          <a
            href="https://defi.xstocks.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            xStocks · {c("Catálogo del proveedor", "Provider catalogue")}
          </a>
          :{" "}
          {c(
            "referencia de instrumentos tokenizados. La inclusión en un catálogo no acredita elegibilidad, acceso, liquidez ni integración con MSIX.",
            "reference for tokenized instruments. Catalogue inclusion does not establish eligibility, access, liquidity or integration with MSIX.",
          )}
        </li>
      </ul>
      <p>
        {c(
          "Fuentes consultadas el 04/11/2026. Los datos externos son referencias estáticas fechadas, no un servicio de precios en tiempo real.",
          "Sources checked on 2026-11-04. External figures are dated static references, not a real-time pricing service.",
        )}
      </p>
      <h2>{c("Riesgos relevantes", "Material risks")}</h2>
      <ul>
        {[
          c(
            "Pérdida parcial o total del capital, volatilidad y concentración en un sector.",
            "Partial or total capital loss, volatility and sector concentration.",
          ),
          c(
            "Acciones tokenizadas: riesgo del emisor, custodia, contraparte, diferencias con la acción subyacente y restricciones de acceso.",
            "Tokenized equities: issuer, custody and counterparty risks, differences from the underlying share and access restrictions.",
          ),
          c(
            "Proyectos musicales: ingresos inciertos, costes no recuperados, disputas de derechos y falta de mercado para salir de la inversión.",
            "Music projects: uncertain proceeds, unrecouped costs, rights disputes and lack of an exit market.",
          ),
          c(
            "Tecnología: fallos de contratos, pérdida de claves, interrupciones de red, riesgo de administración y de liquidez.",
            "Technology: contract failures, lost keys, network outages, administrative risk and liquidity risk.",
          ),
        ].map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      <p>
        <strong>
          {c(
            "Rendimientos pasados no garantizan rendimientos futuros.",
            "Past performance does not guarantee future results.",
          )}
        </strong>{" "}
        {c(
          "Los ejemplos no constituyen asesoramiento individual ni una oferta abierta de valores. La elegibilidad y las condiciones deberán definirse para cada jurisdicción antes de aceptar capital.",
          "Examples are not individual advice or an open securities offering. Eligibility and terms must be defined for each jurisdiction before accepting capital.",
        )}
      </p>
      <h2>{c("Laboratorio devnet y privacidad", "Devnet lab & privacy")}</h2>
      <p>
        {c(
          "El laboratorio existente usa SOL de prueba y un programa separado. Sus participaciones no son MSIX ni MSAF. Solo reparte SOL depositado por el artista; no cobra regalías de plataformas ni verifica ingresos. Los proyectos que no completan su financiación no tienen vencimiento ni reembolso automático.",
          "The existing lab uses test SOL and a separate program. Its shares are not MSIX or MSAF. It distributes only SOL deposited by the artist; it does not collect platform royalties or verify income. Projects that do not reach their funding goal have no expiry or automatic refund.",
        )}
      </p>
      <p>
        {c(
          "El simulador se ejecuta en tu navegador y no envía sus importes a un servidor. El idioma se conserva en el almacenamiento local. Al usar el laboratorio, la wallet y las transacciones interactúan con Solana RPC; los registros de blockchain son públicos. Firebase sirve la web y puede procesar registros técnicos de acceso. No se incorpora seguimiento de redes sociales.",
          "The calculator runs in your browser and does not send its amounts to a server. Language preference is saved locally. In the lab, wallet and transaction requests interact with Solana RPC; blockchain records are public. Firebase serves the website and may process technical access logs. No social media tracking is included.",
        )}
      </p>
      <p>
        <a href="mailto:contact@pdevelop.net">contact@pdevelop.net</a>
      </p>
      <p style={{ marginTop: 30 }}>
        <Link href="/">← {c("Volver a los tokens", "Back to the tokens")}</Link>
      </p>
    </div>
  );
}
