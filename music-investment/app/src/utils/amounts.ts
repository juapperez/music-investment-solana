/** Exact integer arithmetic shared with the on-chain program. */
export type IntegerValue = string | bigint | number | { toString(): string };
const MAX_U64 = (1n << 64n) - 1n;
export function integer(value: IntegerValue): bigint {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) throw new Error('Amount is not a safe integer.');
  const result = BigInt(value.toString());
  if (result < 0n || result > MAX_U64) throw new Error('Amount is outside the supported range.');
  return result;
}
export function parseSol(value: string): bigint {
  const input = value.trim();
  if (!/^\d+(\.\d{1,9})?$/.test(input)) throw new Error('Enter a positive SOL amount with up to 9 decimal places.');
  const [whole, fraction = ''] = input.split('.');
  const result = integer(BigInt(whole) * 1_000_000_000n + BigInt(fraction.padEnd(9, '0')));
  if (result === 0n) throw new Error('The amount must be greater than zero.');
  return result;
}
export function parseShares(value: string): bigint {
  if (!/^[1-9]\d*$/.test(value.trim())) throw new Error('Enter a positive whole number of shares.');
  return integer(value.trim());
}
export function investmentCost(goal: IntegerValue, total: IntegerValue, sold: IntegerValue, buying: IntegerValue): bigint {
  const g = integer(goal), t = integer(total), s = integer(sold), b = integer(buying);
  if (t === 0n || b === 0n || g < t || s + b > t) throw new Error('This share amount is unavailable.');
  return (g * (s + b) / t) - (g * s / t);
}
export function claimableRevenue(revenue: IntegerValue, shares: IntegerValue, total: IntegerValue, claimed: IntegerValue): bigint {
  const t = integer(total), s = integer(shares);
  if (t === 0n || s > t) throw new Error('Invalid share allocation.');
  const earned = integer(revenue) * s / t;
  const paid = integer(claimed);
  return earned > paid ? earned - paid : 0n;
}
export function formatSol(value: IntegerValue): string {
  const n = typeof value === 'bigint' ? value : integer(value);
  if (n < 0n) throw new Error('Amount must not be negative.');
  const fraction = (n % 1_000_000_000n).toString().padStart(9, '0').replace(/0+$/, '');
  return (n / 1_000_000_000n).toString() + (fraction ? '.' + fraction : '');
}
export function validateProject(title: string, description: string, goal: string, shares: string, percent: string) {
  const cleanTitle = title.trim(), cleanDescription = description.trim();
  const bytes = new TextEncoder();
  if (!cleanTitle || bytes.encode(cleanTitle).length > 32) throw new Error('Use a project title of 1–32 UTF-8 bytes.');
  if (!cleanDescription || bytes.encode(cleanDescription).length > 256) throw new Error('Use a description of 1–256 UTF-8 bytes.');
  const fundingGoal = parseSol(goal), totalShares = parseShares(shares);
  if (fundingGoal < totalShares) throw new Error('Each share must cost at least one lamport.');
  if (!/^\d+(\.\d{1,2})?$/.test(percent.trim())) throw new Error('Enter a revenue percentage with up to 2 decimal places.');
  const [whole, fraction = ''] = percent.trim().split('.');
  const revenueShareBps = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(revenueShareBps) || revenueShareBps > 10000) throw new Error('Revenue share must be between 0% and 100%.');
  return { title: cleanTitle, description: cleanDescription, fundingGoal, totalShares, revenueShareBps };
}
