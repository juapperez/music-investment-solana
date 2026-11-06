// Pure deployment planning. No RPC calls, signing, file access or transactions.
const { isDeepStrictEqual } = require("node:util");

function planMint({ account, mint, owner, program, metadata, rentLamports }) {
  if (!Number.isSafeInteger(rentLamports) || rentLamports < 0)
    throw new Error("Invalid rent quote");
  if (!account)
    return {
      remainingRentLamports: rentLamports,
      transactionsRemaining: 2,
      metadataInitialized: false,
    };
  const info = account.data?.parsed?.info;
  if (
    account.owner !== program ||
    account.data?.parsed?.type !== "mint" ||
    !info?.isInitialized ||
    info.supply !== "0" ||
    info.decimals !== 6 ||
    info.mintAuthority !== owner ||
    info.freezeAuthority !== owner
  )
    throw new Error("Unexpected mint identity, authorities or supply");
  if (!Number.isSafeInteger(account.lamports) || account.lamports < 0)
    throw new Error("Invalid mint account balance");
  const extensions = info.extensions || [];
  const allowed = new Set([
    "defaultAccountState",
    "metadataPointer",
    "tokenMetadata",
  ]);
  if (
    extensions.some((e) => !allowed.has(e.extension)) ||
    new Set(extensions.map((e) => e.extension)).size !== extensions.length
  )
    throw new Error("Unexpected or duplicate mint extension");
  const state = extensions.find(
    (e) => e.extension === "defaultAccountState",
  )?.state;
  const pointer = extensions.find(
    (e) => e.extension === "metadataPointer",
  )?.state;
  if (
    state?.accountState !== "frozen" ||
    pointer?.authority !== owner ||
    pointer?.metadataAddress !== mint
  )
    throw new Error("Unexpected default state or metadata pointer");
  const meta = extensions.find((e) => e.extension === "tokenMetadata")?.state;
  if (extensions.some((e) => e.extension === "tokenMetadata") && !meta)
    throw new Error("Malformed existing token metadata");
  if (
    meta &&
    (meta.mint !== mint ||
      meta.updateAuthority !== owner ||
      meta.name !== metadata.name ||
      meta.symbol !== metadata.symbol ||
      meta.uri !== metadata.uri ||
      !Array.isArray(meta.additionalMetadata) ||
      meta.additionalMetadata.length !== 0)
  )
    throw new Error(
      "Existing token metadata does not match the prepared identity",
    );
  return {
    remainingRentLamports: meta
      ? 0
      : Math.max(0, rentLamports - account.lamports),
    transactionsRemaining: meta ? 0 : 1,
    metadataInitialized: !!meta,
  };
}

function remainingBudget(plans, headroomLamports = 500000) {
  const remainingRentLamports = plans.reduce(
    (sum, p) => sum + p.remainingRentLamports,
    0,
  );
  const transactionsRemaining = plans.reduce(
    (sum, p) => sum + p.transactionsRemaining,
    0,
  );
  const feeAndHeadroomLamports = transactionsRemaining ? headroomLamports : 0;
  return {
    remainingRentLamports,
    transactionsRemaining,
    feeAndHeadroomLamports,
    requiredBalanceWithHeadroomLamports:
      remainingRentLamports + feeAndHeadroomLamports,
  };
}

function validateJournal(previous, { network, owner, program }) {
  if (!previous) return;
  if (
    previous.network !== network ||
    previous.owner !== owner ||
    previous.program !== program ||
    !Array.isArray(previous.tokens)
  )
    throw new Error("Previous execution journal identity mismatch");
}

function previousTransactions(previous, { symbol, mint }) {
  const matching = (previous?.tokens || []).filter((t) => t.symbol === symbol);
  if (matching.length > 1 || (matching.length && matching[0].mint !== mint))
    throw new Error("Previous execution journal mint mismatch");
  if (matching.length && !Array.isArray(matching[0].transactions))
    throw new Error("Invalid previous transaction history");
  return structuredClone(matching[0]?.transactions || []);
}

async function verifyPublishedMetadata(items, fetcher = fetch) {
  // Validate every token before the caller can submit the first transaction.
  for (const { uri, metadata } of items) {
    const response = await fetcher(uri, { signal: AbortSignal.timeout(15000) });
    if (
      !response.ok ||
      !isDeepStrictEqual(
        await response.json(),
        JSON.parse(JSON.stringify(metadata)),
      )
    )
      throw new Error(
        "Publish matching metadata for both tokens before mainnet creation",
      );
  }
}

module.exports = {
  planMint,
  remainingBudget,
  validateJournal,
  previousTransactions,
  verifyPublishedMetadata,
};
