// A production build can never enable this undeployed local contract preview.
export const LOCAL_REFUND_PREVIEW =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_REFUND_PREVIEW === "local";
export const LOCAL_REFUND_RPC = "http://127.0.0.1:8899";
export const FUNDING_WINDOW_SECONDS = 30n * 24n * 60n * 60n;

export function clockTimestamp(data: Uint8Array): bigint {
  if (data.byteLength < 40) throw new Error("Incomplete Solana clock account");
  const timestamp = new DataView(data.buffer, data.byteOffset, data.byteLength).getBigInt64(32, true);
  if (timestamp < 0n) throw new Error("Invalid Solana clock timestamp");
  return timestamp;
}

export function refundState({ preview, status, createdAt, chainTime, hasInvestment, isArtist }: {
  preview: boolean; status: string; createdAt: bigint; chainTime: bigint | null;
  hasInvestment: boolean; isArtist: boolean;
}) {
  const deadline = createdAt + FUNDING_WINDOW_SECONDS;
  const expired = preview && status === "Active" && chainTime !== null && chainTime >= deadline;
  return {
    deadline,
    expired,
    canInvest: status === "Active" && (!preview || (chainTime !== null && !expired)),
    canCancel: preview && isArtist && status === "Active",
    canRefund: preview && hasInvestment && (status === "Cancelled" || expired),
  };
}
