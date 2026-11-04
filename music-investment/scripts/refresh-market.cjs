// Read-only public price snapshot. No orders, brokerage access or trades.
const fs = require("node:fs");
const path = require("node:path");
const assets = [
  { ticker: "SPOT", name: "Spotify", weight: 40 },
  { ticker: "AAPL", name: "Apple", weight: 20 },
  { ticker: "AMZN", name: "Amazon", weight: 20 },
  { ticker: "GOOGL", name: "Alphabet", weight: 20 },
];
(async () => {
  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);
  const period2 = Math.floor(cutoff.getTime() / 1000);
  const period1 = period2 - 370 * 86400;
  const series = await Promise.all(
    assets.map(async (asset) => {
      const source = `https://query1.finance.yahoo.com/v8/finance/chart/${asset.ticker}?period1=${period1}&period2=${period2}&interval=1d&includeAdjustedClose=true`;
      const response = await fetch(source, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(25000),
      });
      if (!response.ok)
        throw new Error(`${asset.ticker}: HTTP ${response.status}`);
      const body = await response.json();
      const data = body.chart?.result?.[0];
      if (
        body.chart?.error ||
        data?.meta?.symbol !== asset.ticker ||
        data.meta.currency !== "USD"
      )
        throw new Error("Market identity/currency mismatch");
      const adjusted = data.indicators?.adjclose?.[0]?.adjclose;
      if (!adjusted) throw new Error("Adjusted prices unavailable");
      const observations = new Map(
        data.timestamp.flatMap((time, i) => {
          const price = adjusted[i];
          const date = new Date(time * 1000).toISOString().slice(0, 10);
          return Number.isFinite(price) && price > 0 && time < period2
            ? [[date, price]]
            : [];
        }),
      );
      return {
        ...asset,
        source,
        historyUrl: `https://finance.yahoo.com/quote/${asset.ticker}/history/`,
        observations,
      };
    }),
  );
  const common = [...series[0].observations.keys()]
    .filter((day) => series.every((s) => s.observations.has(day)))
    .sort();
  const endDate = common.at(-1);
  if (!endDate || (cutoff - Date.parse(endDate)) / 86400000 > 7)
    throw new Error("Price history stale or empty");
  const anniversary = new Date(endDate);
  anniversary.setUTCFullYear(anniversary.getUTCFullYear() - 1);
  const target = anniversary.toISOString().slice(0, 10);
  const startDate = common.filter((day) => day <= target).at(-1);
  if (!startDate)
    throw new Error(
      "At least one full year of common observations is required",
    );
  const days = (Date.parse(endDate) - Date.parse(startDate)) / 86400000;
  if (days < 365 || days > 370) throw new Error("Unexpected historical period");
  const snapshot = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    provider: "Yahoo Finance",
    currency: "USD",
    startDate,
    endDate,
    days,
    priceBasis:
      "Adjusted daily close; excludes the current UTC day. Adjustments supplied by the provider.",
    kind: "underlying-stock-history-not-token-performance",
    assets: series.map((a) => {
      const startAdjustedClose = a.observations.get(startDate);
      const endAdjustedClose = a.observations.get(endDate);
      const totalReturnPct = (endAdjustedClose / startAdjustedClose - 1) * 100;
      const annualizedReturnPct =
        (Math.pow(endAdjustedClose / startAdjustedClose, 365 / days) - 1) * 100;
      return {
        ticker: a.ticker,
        name: a.name,
        weight: a.weight,
        startAdjustedClose,
        endAdjustedClose,
        totalReturnPct,
        annualizedReturnPct,
        source: a.source,
        historyUrl: a.historyUrl,
      };
    }),
  };
  snapshot.hypotheticalBasketPeriodReturnPct = snapshot.assets.reduce(
    (sum, a) => sum + (a.weight / 100) * a.totalReturnPct,
    0,
  );
  const output = path.resolve(
    __dirname,
    "../app/public/market/msix-history.json",
  );
  fs.writeFileSync(output + ".tmp", JSON.stringify(snapshot, null, 2) + "\n");
  fs.renameSync(output + ".tmp", output);
  console.log(JSON.stringify(snapshot, null, 2));
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
