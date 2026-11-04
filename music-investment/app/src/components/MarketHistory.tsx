"use client";
import history from "../../public/market/msix-history.json";
import { useLanguage } from "@/context/LanguageContext";
export default function MarketHistory() {
  const { locale } = useLanguage();
  const c = (a: string, b: string) => (locale === "es" ? a : b);
  const number = (v: number) =>
    new Intl.NumberFormat(locale === "es" ? "es-CO" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v);
  return (
    <section id="market-history" className="market-history fund-container">
      <div className="market-heading">
        <div>
          <span className="eyebrow">
            {c(
              "HISTÓRICO DE LAS ACCIONES SUBYACENTES",
              "UNDERLYING STOCK HISTORY",
            )}
          </span>
          <h2>{c("Una referencia comprobable.", "A traceable reference.")}</h2>
          <p>
            {history.startDate} → {history.endDate} · {history.days}{" "}
            {c("días", "days")} · USD
          </p>
        </div>
        <div className="basket-reference">
          <strong>
            {history.hypotheticalBasketPeriodReturnPct > 0 ? "+" : ""}
            {number(history.hypotheticalBasketPeriodReturnPct)}%
          </strong>
          <span>
            {c(
              "Cesta hipotética · bruto del periodo",
              "Hypothetical basket · gross period return",
            )}
          </span>
        </div>
      </div>
      <div
        className="market-table-scroll"
        role="region"
        aria-label={c(
          "Precios y retornos históricos",
          "Historical prices and returns",
        )}
        tabIndex={0}
      >
        <table className="market-table">
          <thead>
            <tr>
              <th>{c("Acción / fuente", "Stock / source")}</th>
              <th>{c("Peso propuesto", "Proposed weight")}</th>
              <th>{c("Cierre ajustado inicial", "Starting adjusted close")}</th>
              <th>{c("Cierre ajustado final", "Ending adjusted close")}</th>
              <th>{c("Retorno del periodo", "Period return")}</th>
            </tr>
          </thead>
          <tbody>
            {history.assets.map((asset) => (
              <tr key={asset.ticker}>
                <th>
                  <a
                    href={asset.historyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {asset.ticker} ↗
                  </a>
                  <span>{asset.name}</span>
                </th>
                <td>{asset.weight}%</td>
                <td>${number(asset.startAdjustedClose)}</td>
                <td>${number(asset.endAdjustedClose)}</td>
                <td className={asset.totalReturnPct < 0 ? "market-loss" : ""}>
                  {asset.totalReturnPct > 0 ? "+" : ""}
                  {number(asset.totalReturnPct)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="market-source">
        {c(
          "Fuente: Yahoo Finance, cierres diarios ajustados; se excluye el día de consulta. Cesta teórica con pesos iniciales 40/20/20/20, mantenida durante el periodo, sin costes ni rebalanceo. No son activos adquiridos ni resultados de MSIX. El simulador usa el retorno anualizado de cada acción como escenario y descuenta costes hipotéticos.",
          "Source: Yahoo Finance, adjusted daily closes; the query date is excluded. Theoretical basket with starting weights 40/20/20/20, held through the period without costs or rebalancing. These are not acquired assets or MSIX results. The calculator uses each stock’s annualized return as a scenario and deducts hypothetical costs.",
        )}
      </p>
      <p className="market-source">
        {c("Consulta", "Retrieved")}: {history.capturedAt.slice(0, 10)} ·{" "}
        <a
          href="/market/msix-history.json"
          target="_blank"
          rel="noopener noreferrer"
        >
          {c(
            "Datos, cálculo y URLs de origen (JSON)",
            "Data, calculation & source URLs (JSON)",
          )}
        </a>{" "}
        ·{" "}
        {c(
          "Referencia estática, no cotización en vivo. Rendimientos pasados no garantizan futuros.",
          "Static reference, not a live quote. Past performance does not guarantee future results.",
        )}
      </p>
    </section>
  );
}
