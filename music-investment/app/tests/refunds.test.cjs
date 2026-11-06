const { test } = require("node:test");
const assert = require("node:assert/strict");
const { refundState, clockTimestamp, FUNDING_WINDOW_SECONDS } = require("../src/utils/refunds.ts");
const base = { preview: true, status: "Active", createdAt: 10n, chainTime: 11n, hasInvestment: true, isArtist: false };

test("deadline uses chain time and includes the exact closing second", () => {
  const deadline = 10n + FUNDING_WINDOW_SECONDS;
  assert.equal(refundState({ ...base, chainTime: deadline - 1n }).canInvest, true);
  const state = refundState({ ...base, chainTime: deadline });
  assert.equal(state.expired, true);
  assert.equal(state.canInvest, false);
  assert.equal(state.canRefund, true);
  assert.equal(refundState({ ...base, chainTime: null }).canInvest, false);
  assert.equal(refundState({ ...base, chainTime: null }).canRefund, false);
});
test("only an artist can cancel and only a contributor can claim; funded projects stay closed", () => {
  assert.equal(refundState(base).canCancel, false);
  assert.equal(refundState({ ...base, isArtist: true }).canCancel, true);
  assert.equal(refundState({ ...base, status: "Cancelled", chainTime: null }).canRefund, true);
  assert.equal(refundState({ ...base, status: "Cancelled", hasInvestment: false }).canRefund, false);
  for (const status of ["Funded", "Released"]) {
    const state = refundState({ ...base, status, isArtist: true, chainTime: 9999999999n });
    assert.equal(state.canCancel || state.canRefund || state.canInvest, false);
  }
});
test("without the local preview the deployed program's funding behavior is preserved", () => {
  const state = refundState({ ...base, preview: false, isArtist: true, chainTime: 9999999999n });
  assert.equal(state.canInvest, true);
  assert.equal(state.canCancel || state.canRefund || state.expired, false);
  assert.equal(refundState({ ...base, preview: false, status: "Cancelled" }).canRefund, false);
});
test("Solana clock decoder respects buffer offsets and rejects malformed data", () => {
  const backing = new Uint8Array(70);
  const account = backing.subarray(11, 51);
  new DataView(backing.buffer).setBigInt64(43, 1790000000n, true);
  assert.equal(clockTimestamp(account), 1790000000n);
  assert.throws(() => clockTimestamp(account.subarray(0, 39)), /Incomplete/);
  new DataView(backing.buffer).setBigInt64(43, -1n, true);
  assert.throws(() => clockTimestamp(account), /Invalid/);
});
