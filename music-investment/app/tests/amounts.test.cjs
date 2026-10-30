const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseSol, parseShares, investmentCost, claimableRevenue, formatSol, validateProject } = require('../src/utils/amounts.ts');
test('SOL conversion retains a single lamport and rejects rounded or unsafe input', () => {
  assert.equal(parseSol('0.000000001'), 1n);
  assert.equal(parseSol('9007199.254740993'), 9007199254740993n);
  for (const x of ['0', '-1', '1e3', 'NaN', '0.0000000001', '18446744074']) assert.throws(() => parseSol(x));
  assert.equal(formatSol(9007199254740993n), '9007199.254740993');
});
test('fractional shares cannot be silently truncated', () => {
  for (const x of ['1.5', '0', '-1', '1e2', '1abc']) assert.throws(() => parseShares(x));
});
test('rounding reaches the funding goal regardless of purchase grouping', () => {
  assert.equal(investmentCost(10, 3, 0, 1) + investmentCost(10, 3, 1, 2), 10n);
  assert.throws(() => investmentCost(1, 2, 0, 1));
  assert.throws(() => investmentCost(10, 3, 2, 2));
});
test('small allocations receive revenue without basis-point truncation', () => {
  assert.equal(claimableRevenue(1000000000, 1, 100000, 0), 10000n);
  assert.equal(claimableRevenue(1000000000, 1, 100000, 10000), 0n);
});
test('project seed limits count UTF-8 bytes and percentages must be finite', () => {
  assert.throws(() => validateProject('🎵'.repeat(9), 'Album', '1', '100', '30'));
  assert.throws(() => validateProject('Album', 'A'.repeat(257), '1', '100', '30'));
  assert.throws(() => validateProject('Album', 'New album', '1', '100', 'NaN'));
  assert.equal(validateProject('Album', 'New album', '1', '100', '30.25').revenueShareBps, 3025);
});
