"use client";
import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { calculateReturn, weightedReturn } from "@/lib/returns";
import history from "../../public/market/msix-history.json";

type Strategy = "index" | "artists";
export default function ReturnCalculator({
  strategy,
  setStrategy,
}: {
  strategy: Strategy;
  setStrategy: (s: Strategy) => void;
}) {
  const { locale } = useLanguage();
  const c = (a: string, b: string) => (locale === "es" ? a : b);
  const [capital, setCapital] = useState("1000");
  const [purchase, setPurchase] = useState("0.25");
  const [network, setNetwork] = useState("0.10");
  const [annualFees, setAnnualFees] = useState({ index: "1", artists: "2" });
  const [rebalance, setRebalance] = useState("0.2");
  const [privateReturn, setPrivateReturn] = useState("8");
  const historicalReturns = history.assets.map((a) =>
    a.annualizedReturnPct.toFixed(4),
  );
  const [assetReturns, setAssetReturns] = useState(historicalReturns);
  const tickers = history.assets.map((a) => a.ticker);
  const weights = history.assets.map((a) => a.weight);
  const usingHistory = assetReturns.every((v, i) => v === historicalReturns[i]);
  const parse = (v: string) => (v.trim() === "" ? NaN : Number(v));
  const money = (v: number) =>
    new Intl.NumberFormat(locale === "es" ? "es-CO" : "en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(v);
  const percent = (v: number) =>
    new Intl.NumberFormat(locale === "es" ? "es-CO" : "en-US", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(v) + "%";
  let result: ReturnType<typeof calculateReturn> | null = null;
  let gross = NaN;
  try {
    gross =
      strategy === "index"
        ? weightedReturn(
            assetReturns.map((v, i) => ({
              weight: weights[i],
              returnPct: parse(v),
            })),
          )
        : parse(privateReturn);
    result = calculateReturn({
      capital: parse(capital),
      grossReturnPct: gross,
      purchaseFeePct: parse(purchase),
      annualFeePct: parse(annualFees[strategy]),
      rebalanceCostPct: strategy === "index" ? parse(rebalance) : 0,
      networkCostUsd: parse(network),
    });
  } catch {
    /* Invalid inputs intentionally replace, rather than retain, results. */
  }
  function scenario(value: number) {
    if (strategy === "index") setAssetReturns(tickers.map(() => String(value)));
    else setPrivateReturn(String(value));
  }
  return (
    <div className="calculator">
      <div className="calc-controls">
        <div
          className="strategy-tabs"
          role="group"
          aria-label={c("Estrategia", "Strategy")}
        >
          <button
            aria-pressed={strategy === "index"}
            onClick={() => setStrategy("index")}
          >
            MSIX · Music Index
          </button>
          <button
            aria-pressed={strategy === "artists"}
            onClick={() => setStrategy("artists")}
          >
            MSAF · Artist Fund
          </button>
        </div>
        <p className="calc-assumption">
          {c(
            "Los costes son supuestos editables, no tarifas aprobadas. Ningún resultado es rentabilidad real de nuestros tokens.",
            "Costs are editable assumptions, not approved fees. No result is actual performance of our tokens.",
          )}
        </p>
        <label className="calc-field capital-field">
          {c("Capital hipotético (USD)", "Hypothetical capital (USD)")}
          <input
            type="number"
            min="1"
            max="1000000000"
            step="100"
            value={capital}
            onChange={(e) => setCapital(e.target.value)}
          />
        </label>
        <div
          className="scenario-buttons"
          role="group"
          aria-label={c(
            "Escenarios de rendimiento bruto",
            "Gross return scenarios",
          )}
        >
          <button onClick={() => scenario(-30)}>
            {c("Adverso", "Downside")} −30%
          </button>
          <button onClick={() => scenario(8)}>
            {c("Ilustrativo", "Illustrative")} 8%
          </button>
          <button onClick={() => scenario(20)}>
            {c("Favorable", "Upside")} 20%
          </button>
          {strategy === "index" && (
            <button onClick={() => setAssetReturns(historicalReturns)}>
              {c("Usar histórico", "Use history")}
            </button>
          )}
        </div>
        {strategy === "index" ? (
          <fieldset className="basket-fields">
            <legend>
              {c(
                "Retorno anual por acción para el escenario (%)",
                "Annual stock return used in the scenario (%)",
              )}
            </legend>
            <div>
              {tickers.map((ticker, i) => (
                <label key={ticker} className="calc-field">
                  {ticker} <span>{weights[i]}%</span>
                  <input
                    aria-label={`${ticker} ${c("retorno anual", "annual return")}`}
                    type="number"
                    min="-100"
                    max="1000"
                    step="any"
                    value={assetReturns[i]}
                    onChange={(e) =>
                      setAssetReturns((previous) =>
                        previous.map((v, j) => (j === i ? e.target.value : v)),
                      )
                    }
                  />
                </label>
              ))}
            </div>
            <p>
              {c(
                "Incluye los ajustes de dividendos del proveedor; no los sumes de nuevo. Las acciones subyacentes pueden diferir de sus instrumentos tokenizados.",
                "Includes the provider’s dividend adjustments; do not add them again. Underlying shares may differ from their tokenized instruments.",
              )}
            </p>
            <p className="history-mode">
              {usingHistory
                ? c(
                    "Histórico de acciones subyacentes",
                    "Underlying stock history",
                  )
                : c(
                    "Escenario modificado por el usuario",
                    "User-modified scenario",
                  )}{" "}
              · {history.startDate} → {history.endDate}.{" "}
              <a href="#market-history">
                {c("Fechas, precios y fuentes", "Dates, prices & sources")}
              </a>
            </p>
          </fieldset>
        ) : (
          <label className="calc-field">
            {c(
              "Retorno bruto anual supuesto (%)",
              "Assumed annual gross return (%)",
            )}
            <input
              type="number"
              min="-100"
              max="1000"
              step="0.1"
              value={privateReturn}
              onChange={(e) => setPrivateReturn(e.target.value)}
            />
          </label>
        )}
        <div className="fee-fields">
          <label className="calc-field">
            {c("Comisión de compra (%)", "Purchase fee (%)")}
            <input
              type="number"
              min="0"
              max="100"
              step="0.05"
              value={purchase}
              onChange={(e) => setPurchase(e.target.value)}
            />
          </label>
          <label className="calc-field">
            {strategy === "index"
              ? c("Indexación anual (%)", "Annual indexing fee (%)")
              : c("Administración anual (%)", "Annual administration (%)")}
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={annualFees[strategy]}
              onChange={(e) =>
                setAnnualFees((previous) => ({
                  ...previous,
                  [strategy]: e.target.value,
                }))
              }
            />
          </label>
          <label className="calc-field">
            {c("Red de entrada (USD)", "Entry network cost (USD)")}
            <input
              type="number"
              min="0"
              step="0.01"
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
            />
          </label>
          {strategy === "index" && (
            <label className="calc-field">
              {c("Rebalanceo anual (%)", "Annual rebalancing (%)")}
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={rebalance}
                onChange={(e) => setRebalance(e.target.value)}
              />
            </label>
          )}
        </div>
      </div>
      <div className="calc-output" aria-live="polite" aria-atomic="true">
        <span className="eyebrow">
          {c("RESULTADO HIPOTÉTICO A 1 AÑO", "HYPOTHETICAL ONE-YEAR RESULT")}
        </span>
        {result ? (
          <>
            <div
              className={`net-return ${result.netReturnPct < 0 ? "negative" : ""}`}
              data-testid="net-return"
            >
              {result.netReturnPct > 0 ? "+" : ""}
              {percent(result.netReturnPct)}
            </div>
            <p>{c("Rendimiento neto simulado", "Simulated net return")}</p>
            <div className="result-total">
              <span>{c("Valor final simulado", "Simulated ending value")}</span>
              <strong data-testid="end-value">{money(result.endValue)}</strong>
            </div>
            <dl className="calc-breakdown">
              <div>
                <dt>{c("Capital inicial", "Starting capital")}</dt>
                <dd>{money(parse(capital))}</dd>
              </div>
              <div>
                <dt>{c("Compra + red", "Purchase + network")}</dt>
                <dd>−{money(result.purchaseCost + parse(network))}</dd>
              </div>
              <div>
                <dt>{c("Capital invertido", "Invested capital")}</dt>
                <dd>{money(result.invested)}</dd>
              </div>
              <div>
                <dt>
                  {c("Resultado bruto", "Gross result")} ({percent(gross)})
                </dt>
                <dd>{money(result.grossProfit)}</dd>
              </div>
              <div>
                <dt>{c("Gestión + rebalanceo", "Management + rebalance")}</dt>
                <dd>−{money(result.annualCost + result.rebalanceCost)}</dd>
              </div>
              <div className="net-profit">
                <dt>{c("Ganancia / pérdida neta", "Net profit / loss")}</dt>
                <dd>{money(result.profit)}</dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="calc-error" role="alert">
            {c(
              "Introduce valores válidos. El capital debe ser positivo, los costes menores al capital y el retorno entre −100 % y 1.000 %.",
              "Enter valid values. Capital must be positive, entry costs below capital, and return between −100% and 1,000%.",
            )}
          </p>
        )}
        <p className="calc-disclosure">
          {c(
            "Sin impuestos ni costes de salida. Los costes anuales se aplican al capital invertido inicial; no se reinvierten distribuciones. El valor final se limita a cero, sin deuda. No representa una oferta, NAV real ni rendimiento garantizado.",
            "Excludes taxes and exit costs. Annual costs apply to starting invested capital; distributions are not reinvested. Ending value is floored at zero, with no debt. This is not an offer, actual NAV or guaranteed return.",
          )}
        </p>
        <details className="calc-formula">
          <summary>{c("Ver cálculo", "View calculation")}</summary>
          <p>
            {c(
              "Invertido = capital − compra − red. Valor final = máximo(0, invertido × (1 + retorno bruto − gestión − rebalanceo)). Retorno neto = valor final / capital − 1.",
              "Invested = capital − purchase − network. Ending value = max(0, invested × (1 + gross return − management − rebalance)). Net return = ending value / capital − 1.",
            )}
          </p>
        </details>
      </div>
    </div>
  );
}
