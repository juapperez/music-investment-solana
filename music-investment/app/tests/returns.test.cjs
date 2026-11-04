const { test } = require("node:test");
const assert = require("node:assert/strict");
const { calculateReturn, weightedReturn } = require("../src/lib/returns.ts");
const base = {
  capital: 1000,
  grossReturnPct: 8,
  purchaseFeePct: 0.25,
  annualFeePct: 1,
  rebalanceCostPct: 0.2,
  networkCostUsd: 0.1,
};
test("deducts entry, network, indexing and rebalance costs once", () => {
  const r = calculateReturn(base);
  assert.equal(r.invested, 997.4);
  assert.ok(Math.abs(r.endValue - 1065.2232) < 1e-8);
  assert.ok(Math.abs(r.netReturnPct - 6.52232) < 1e-8);
});
test("retains losses; zero market return still incurs costs; loss capped at capital", () => {
  assert.ok(
    calculateReturn({ ...base, grossReturnPct: -20 }).netReturnPct < -20,
  );
  assert.ok(calculateReturn({ ...base, grossReturnPct: 0 }).netReturnPct < 0);
  assert.equal(calculateReturn({ ...base, grossReturnPct: -100 }).endValue, 0);
});
test("rejects nonfinite inputs, negative fees, invalid capital and excess costs", () => {
  for (const patch of [
    { capital: 0 },
    { capital: NaN },
    { networkCostUsd: Infinity },
    { annualFeePct: -1 },
    { networkCostUsd: 1000 },
    { grossReturnPct: -101 },
  ])
    assert.throws(() => calculateReturn({ ...base, ...patch }));
});
test("weights the basket and requires complete nonnegative allocation", () => {
  assert.equal(
    weightedReturn([
      { weight: 75, returnPct: -20 },
      { weight: 25, returnPct: 20 },
    ]),
    -10,
  );
  assert.throws(() => weightedReturn([{ weight: 50, returnPct: 8 }]));
  assert.throws(() =>
    weightedReturn([
      { weight: -10, returnPct: 8 },
      { weight: 110, returnPct: 8 },
    ]),
  );
});
