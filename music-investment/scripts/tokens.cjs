#!/usr/bin/env node
// Create zero-supply Token-2022 identities only. Never purchases assets,
// accepts investor deposits, mints supply, transfers tokens or opens a market.
// Default: read-only network preflight plus local preparation.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");
const { Keypair } = require("../app/node_modules/@solana/web3.js");
const operator = require("../app/public/legal/operator.json");
const { tokenMetadata, mintSpace } = require("./token-layout.cjs");
const {
  planMint,
  remainingBudget,
  validateJournal,
  previousTransactions,
  verifyPublishedMetadata,
} = require("./token-deployment.cjs");
const args = process.argv.slice(2);
const network =
  args.find((a) => a.startsWith("--network="))?.split("=")[1] || "devnet";
if (!["devnet", "mainnet-beta"].includes(network))
  throw new Error("Unsupported network");
const execute = args.includes("--execute");
const rpc =
  network === "devnet"
    ? "https://api.devnet.solana.com"
    : "https://api.mainnet-beta.solana.com";
const genesisHashes = {
  "mainnet-beta": "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
  devnet: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
};
const program = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const root = path.resolve(__dirname, "..");
const registryPath = path.join(root, "app/public/tokens/registry.json");
const keyDir = path.join(os.homedir(), ".config/music-solana/tokens", network);
const payerPath =
  process.env.MUSIC_SOLANA_ISSUER_KEYPAIR ||
  path.join(os.homedir(), ".config/solana/id.json");
const cli = (name) =>
  path.join(
    os.homedir(),
    ".local/share/solana/install/active_release/bin",
    name,
  );
const reportPath = path.join(
  root,
  `verification/tokens-${network}${execute ? "" : "-preflight"}.json`,
);
function atomicWrite(file, data, mode = 0o644) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file + ".tmp", JSON.stringify(data, null, 2) + "\n", {
    mode,
  });
  fs.renameSync(file + ".tmp", file);
}
async function call(method, params = []) {
  const response = await fetch(rpc, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const body = await response.json();
  if (body.error)
    throw new Error(`RPC error for ${method}: ${body.error.code}`);
  return body.result;
}
async function account(address) {
  return (
    await call("getAccountInfo", [
      address,
      { encoding: "jsonParsed", commitment: "confirmed" },
    ])
  ).value;
}
function command(commandArgs) {
  const result = execFileSync(
    cli("spl-token"),
    [
      "--url",
      rpc,
      "--program-2022",
      "--fee-payer",
      payerPath,
      "--output",
      "json",
      ...commandArgs,
    ],
    { encoding: "utf8", timeout: 180000 },
  );
  try {
    return JSON.parse(result);
  } catch {
    return { cliCompleted: true };
  }
}
(async () => {
  if ((await call("getGenesisHash")) !== genesisHashes[network])
    throw new Error("RPC genesis mismatch");
  const payer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(payerPath, "utf8"))),
  );
  const owner = payer.publicKey.toBase58();
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const previous =
    execute && fs.existsSync(reportPath)
      ? JSON.parse(fs.readFileSync(reportPath, "utf8"))
      : null;
  validateJournal(previous, { network, owner, program });
  fs.mkdirSync(keyDir, { recursive: true, mode: 0o700 });
  const balance = (
    await call("getBalance", [owner, { commitment: "confirmed" }])
  ).value;
  const rentQuotes = await Promise.all(
    registry.tokens.map(async (token) => {
      const space = mintSpace(tokenMetadata(token, network));
      return {
        symbol: token.symbol,
        space,
        rentLamports: await call("getMinimumBalanceForRentExemption", [space]),
      };
    }),
  );
  const rentBudget = rentQuotes.reduce(
    (total, quote) => total + quote.rentLamports,
    0,
  );
  const report = {
    checkedAt: new Date().toISOString(),
    network,
    genesisVerified: true,
    program,
    owner,
    balanceLamports: balance,
    operator: operator.legalName,
    estimatedRentLamports: rentBudget,
    rentQuotes,
    feeAndHeadroomLamports: 500000,
    requiredBalanceWithHeadroomLamports: rentBudget + 500000,
    recommendedFundingSol: Math.ceil((rentBudget + 500000) / 10000000) / 100,
    mode: execute ? "execute-empty-identities" : "preflight",
    completed: false,
    previousAttempts: previous
      ? [
          ...(previous.previousAttempts || []),
          {
            checkedAt: previous.checkedAt,
            completed: previous.completed === true,
            balanceLamports: previous.balanceLamports,
            balanceAfterLamports: previous.balanceAfterLamports,
          },
        ]
      : [],
    tokens: [],
  };
  const prepared = [];
  for (const token of registry.tokens) {
    const keyPath = path.join(keyDir, token.symbol.toLowerCase() + ".json");
    const registered = token[network === "devnet" ? "devnet" : "mainnet"];
    if (registered && !fs.existsSync(keyPath))
      throw new Error(
        "Registered mint key missing; refusing to create a replacement identity",
      );
    if (!fs.existsSync(keyPath))
      atomicWrite(keyPath, Array.from(Keypair.generate().secretKey), 0o600);
    const mint = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync(keyPath, "utf8"))),
    ).publicKey.toBase58();
    if (registered && registered.mint !== mint)
      throw new Error("Registry/key mismatch; refusing to replace identity");
    const shortNetwork = network === "devnet" ? "devnet" : "mainnet";
    const uri = `https://musicsolana.web.app/tokens/${shortNetwork}/${token.symbol.toLowerCase()}.json`;
    const tokenName = network === "devnet" ? `${token.name} Test` : token.name;
    const metadata = {
      name: tokenName,
      symbol: token.symbol,
      description: `${network === "devnet" ? "Devnet test token. No monetary value. " : "Pre-launch token identity. "}Zero supply at creation. No backing assets, investment offering or economic rights are established. ${token.symbol === "MSIX" ? "Proposed music-related equity index." : "Proposed private music-project strategy."} Past performance does not guarantee future results.`,
      image: `https://musicsolana.web.app/tokens/${token.symbol.toLowerCase()}.svg`,
      external_url: "https://musicsolana.web.app/",
      issuer: {
        name: operator.legalName,
        jurisdiction: operator.jurisdiction,
        country: operator.countryCode,
        registrationNumber: operator.registrationNumber,
        details: "https://musicsolana.web.app/legal/operator.json",
      },
      attributes: [
        { trait_type: "Network", value: network },
        { trait_type: "Issuer", value: operator.legalName },
        { trait_type: "Status", value: "Pre-launch; no investment rights" },
      ],
    };
    atomicWrite(
      path.join(
        root,
        "app/public/tokens",
        shortNetwork,
        token.symbol.toLowerCase() + ".json",
      ),
      metadata,
    );
    const data = await account(mint);
    const rentLamports = rentQuotes.find(
      (quote) => quote.symbol === token.symbol,
    ).rentLamports;
    const expected = {
      mint,
      owner,
      program,
      metadata: tokenMetadata(token, network),
      rentLamports,
    };
    const plan = planMint({ account: data, ...expected });
    const item = {
      symbol: token.symbol,
      mint,
      metadataUri: uri,
      deployed: !!data,
      ...plan,
      transactions: previousTransactions(previous, {
        symbol: token.symbol,
        mint,
      }),
    };
    report.tokens.push(item);
    prepared.push({
      token,
      item,
      keyPath,
      mint,
      uri,
      tokenName,
      shortNetwork,
      metadata,
      expected,
    });
  }
  Object.assign(report, remainingBudget(report.tokens));
  report.recommendedFundingSol =
    Math.ceil(report.requiredBalanceWithHeadroomLamports / 10000000) / 100;
  atomicWrite(reportPath, report);
  if (execute) {
    // Both identities and both public metadata documents must pass before spending gas.
    if (network === "mainnet-beta")
      await verifyPublishedMetadata(prepared, fetch);
    report.balanceBeforeExecutionLamports = (
      await call("getBalance", [owner, { commitment: "confirmed" }])
    ).value;
    if (
      report.balanceBeforeExecutionLamports <
      report.requiredBalanceWithHeadroomLamports
    )
      throw new Error(
        "Insufficient SOL for the remaining rent and fee budget. Preflight saved.",
      );
    for (const {
      token,
      item,
      keyPath,
      mint,
      uri,
      tokenName,
      shortNetwork,
      expected,
    } of prepared) {
      let data = await account(mint);
      planMint({ account: data, ...expected });
      if (!data) {
        item.transactions.push(
          command([
            "create-token",
            "--decimals",
            "6",
            "--enable-metadata",
            "--enable-freeze",
            "--default-account-state",
            "frozen",
            "--mint-authority",
            owner,
            keyPath,
          ]),
        );
        atomicWrite(reportPath, report);
        data = await account(mint);
      }
      if (!data)
        throw new Error(
          "Created mint is not yet visible; resume after confirmation",
        );
      if (!planMint({ account: data, ...expected }).metadataInitialized) {
        item.transactions.push(
          command([
            "initialize-metadata",
            mint,
            tokenName,
            token.symbol,
            uri,
            "--mint-authority",
            payerPath,
            "--update-authority",
            owner,
          ]),
        );
        atomicWrite(reportPath, report);
      }
      data = await account(mint);
      const completedPlan = planMint({ account: data, ...expected });
      if (!completedPlan.metadataInitialized)
        throw new Error("Token metadata readback incomplete");
      const verified = data.data.parsed.info;
      const meta = verified.extensions?.find(
        (e) => e.extension === "tokenMetadata",
      )?.state;
      const defaultState = verified.extensions?.find(
        (e) => e.extension === "defaultAccountState",
      )?.state;
      if (
        verified.supply !== "0" ||
        meta?.name !== tokenName ||
        meta?.symbol !== token.symbol ||
        meta?.uri !== uri ||
        meta?.updateAuthority !== owner ||
        defaultState?.accountState !== "frozen"
      )
        throw new Error(
          "Token metadata, supply or default state readback failed",
        );
      item.deployed = true;
      item.verifiedAt = new Date().toISOString();
      item.supply = verified.supply;
      item.decimals = verified.decimals;
      item.mintAuthority = verified.mintAuthority;
      item.freezeAuthority = verified.freezeAuthority;
      item.metadata = meta;
      item.defaultAccountState = defaultState;
      Object.assign(item, completedPlan);
      token[shortNetwork] = {
        mint,
        supply: verified.supply,
        verifiedAt: item.verifiedAt,
      };
      atomicWrite(registryPath, registry);
      atomicWrite(reportPath, report);
    }
  }
  report.balanceAfterLamports = (
    await call("getBalance", [owner, { commitment: "confirmed" }])
  ).value;
  // A balance delta may include unrelated deposits/withdrawals; it is not a fee receipt.
  report.netBalanceDecreaseLamports = balance - report.balanceAfterLamports;
  report.remainingAfterRun = remainingBudget(report.tokens);
  report.completed = true;
  atomicWrite(reportPath, report);
  console.log(JSON.stringify(report, null, 2));
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
