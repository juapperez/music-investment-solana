export type ReturnInputs = {
  capital: number;
  grossReturnPct: number;
  purchaseFeePct: number;
  annualFeePct: number;
  rebalanceCostPct: number;
  networkCostUsd: number;
};

// One-year USD scenario: entry costs first, annual costs on invested capital.
// Excludes taxes/exit costs. No leverage or interim reinvestment assumed.
export function calculateReturn(input: ReturnInputs) {
  const {
    capital,
    grossReturnPct,
    purchaseFeePct,
    annualFeePct,
    rebalanceCostPct,
    networkCostUsd,
  } = input;
  if (Object.values(input).some((v) => !Number.isFinite(v)))
    throw new Error("Enter finite values");
  if (capital <= 0 || capital > 1e9) throw new Error("Invalid capital");
  if (grossReturnPct < -100 || grossReturnPct > 1000)
    throw new Error("Invalid return");
  for (const fee of [purchaseFeePct, annualFeePct, rebalanceCostPct])
    if (fee < 0 || fee > 100) throw new Error("Invalid fees");
  if (networkCostUsd < 0) throw new Error("Invalid network cost");
  const purchaseCost = (capital * purchaseFeePct) / 100;
  const invested = capital - purchaseCost - networkCostUsd;
  if (invested <= 0) throw new Error("Entry costs must be lower than capital");
  const grossProfit = (invested * grossReturnPct) / 100;
  const annualCost = (invested * annualFeePct) / 100;
  const rebalanceCost = (invested * rebalanceCostPct) / 100;
  const endValue = Math.max(
    0,
    invested + grossProfit - annualCost - rebalanceCost,
  );
  const profit = endValue - capital;
  return {
    invested,
    purchaseCost,
    grossProfit,
    annualCost,
    rebalanceCost,
    endValue,
    profit,
    netReturnPct: (profit / capital) * 100,
  };
}

export function weightedReturn(
  assets: { weight: number; returnPct: number }[],
) {
  if (
    !assets.length ||
    assets.some(
      (a) =>
        !Number.isFinite(a.weight) ||
        !Number.isFinite(a.returnPct) ||
        a.weight < 0 ||
        a.weight > 100 ||
        a.returnPct < -100 ||
        a.returnPct > 1000,
    )
  )
    throw new Error("Invalid basket");
  if (Math.abs(assets.reduce((sum, a) => sum + a.weight, 0) - 100) > 0.000001)
    throw new Error("Weights must total 100%");
  return assets.reduce((sum, a) => sum + (a.weight / 100) * a.returnPct, 0);
}
