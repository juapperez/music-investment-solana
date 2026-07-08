import { PublicKey } from "@solana/web3.js";

// ── Platform monetization ────────────────────────────────────────────────
// The marketplace charges a small fee on each investment. The fee is a plain
// SOL transfer to the treasury wallet, attached to the SAME transaction as the
// on-chain `invest` call — so it settles atomically with the investment and
// needs no change to the deployed program.
//
// To start collecting fees, set the treasury wallet to YOUR address, either by
// editing PLATFORM_TREASURY_FALLBACK below or (preferred) by setting the env
// var NEXT_PUBLIC_PLATFORM_TREASURY at build time. Until a valid treasury is
// configured, no fee is charged.

// Fee in basis points (100 = 1%). Default 2.5%.
export const PLATFORM_FEE_BPS = Number(
  process.env.NEXT_PUBLIC_PLATFORM_FEE_BPS ?? 250
);

// Put your wallet address here (or via NEXT_PUBLIC_PLATFORM_TREASURY).
const PLATFORM_TREASURY_FALLBACK = "";

const TREASURY_ADDRESS =
  process.env.NEXT_PUBLIC_PLATFORM_TREASURY ?? PLATFORM_TREASURY_FALLBACK;

/** Returns the configured treasury PublicKey, or null if none/invalid. */
export function getPlatformTreasury(): PublicKey | null {
  if (!TREASURY_ADDRESS) return null;
  try {
    return new PublicKey(TREASURY_ADDRESS);
  } catch {
    return null;
  }
}

/** Whether a platform fee will actually be charged (treasury set + fee > 0). */
export function platformFeeEnabled(): boolean {
  return getPlatformTreasury() !== null && PLATFORM_FEE_BPS > 0;
}

/** Platform fee (in lamports) for a gross investment amount (in lamports). */
export function platformFeeLamports(investmentLamports: number): number {
  return Math.floor((investmentLamports * PLATFORM_FEE_BPS) / 10000);
}
