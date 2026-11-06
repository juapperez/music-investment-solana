const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const helpers = require("../../scripts/token-deployment.cjs");
const layout = require("../../scripts/token-layout.cjs");
const operator = require("../public/legal/operator.json");
const registry = require("../public/tokens/registry.json");
const previousPreflight = require("../../verification/tokens-mainnet-beta-preflight.json");
const owner = previousPreflight.owner;
const program = previousPreflight.program;
const network = "mainnet-beta";

function mintAccount(index, complete = true) {
  const mint = previousPreflight.tokens[index].mint;
  const metadata = layout.tokenMetadata(registry.tokens[index], network);
  return {
    owner: program,
    lamports: complete
      ? previousPreflight.rentQuotes[index].rentLamports
      : 2550000,
    data: {
      parsed: {
        type: "mint",
        info: {
          isInitialized: true,
          supply: "0",
          decimals: 6,
          mintAuthority: owner,
          freezeAuthority: owner,
          extensions: [
            {
              extension: "defaultAccountState",
              state: { accountState: "frozen" },
            },
            {
              extension: "metadataPointer",
              state: { authority: owner, metadataAddress: mint },
            },
            ...(complete
              ? [
                  {
                    extension: "tokenMetadata",
                    state: {
                      ...metadata,
                      mint,
                      updateAuthority: owner,
                      additionalMetadata: [],
                    },
                  },
                ]
              : []),
          ],
        },
      },
    },
  };
}

const expected = (i) => ({
  mint: previousPreflight.tokens[i].mint,
  owner,
  program,
  metadata: layout.tokenMetadata(registry.tokens[i], network),
  rentLamports: previousPreflight.rentQuotes[i].rentLamports,
});

test("resumption budgets only the uncreated token and metadata rent still owed", () => {
  const complete = helpers.planMint({
    account: mintAccount(0),
    ...expected(0),
  });
  const missing = helpers.planMint({ account: null, ...expected(1) });
  assert.equal(
    helpers.remainingBudget([complete, missing])
      .requiredBalanceWithHeadroomLamports,
    3197480,
  );
  const partial = helpers.planMint({
    account: mintAccount(1, false),
    ...expected(1),
  });
  assert.equal(partial.remainingRentLamports, 147480);
  assert.equal(partial.transactionsRemaining, 1);
  assert.equal(
    helpers.remainingBudget([complete, complete])
      .requiredBalanceWithHeadroomLamports,
    0,
  );
});

test("rejects changed supply, authorities, pointers, state and metadata before planning a write", () => {
  const mutations = [
    (a) => {
      a.owner = "wrong-program";
    },
    (a) => {
      a.data.parsed.info.supply = "1";
    },
    (a) => {
      a.data.parsed.info.freezeAuthority = "other";
    },
    (a) => {
      a.data.parsed.info.extensions[0].state.accountState = "initialized";
    },
    (a) => {
      a.data.parsed.info.extensions[1].state.metadataAddress = "other";
    },
    (a) => {
      a.data.parsed.info.extensions[2].state.uri = "https://other.invalid";
    },
    (a) => {
      a.data.parsed.info.extensions.push({ extension: "transferHook" });
    },
  ];
  for (const mutate of mutations) {
    const a = mintAccount(0);
    mutate(a);
    assert.throws(() => helpers.planMint({ account: a, ...expected(0) }));
  }
});

test("keeps prior transactions without allowing a journal for a different owner or mint", () => {
  const previous = {
    network,
    owner,
    program,
    tokens: [
      {
        symbol: "MSIX",
        mint: expected(0).mint,
        transactions: [{ signature: "previous-signature" }],
      },
    ],
  };
  helpers.validateJournal(previous, { network, owner, program });
  const copy = helpers.previousTransactions(previous, {
    symbol: "MSIX",
    mint: expected(0).mint,
  });
  copy.push({ signature: "new-signature" });
  assert.equal(previous.tokens[0].transactions.length, 1);
  assert.throws(() =>
    helpers.validateJournal(previous, { network, owner: "other", program }),
  );
  assert.throws(() =>
    helpers.previousTransactions(previous, { symbol: "MSIX", mint: "other" }),
  );
});

// Run the real CLI orchestration against an in-memory filesystem, RPC and SPL CLI.
// It cannot read real keys, access the network, launch commands or submit transactions.
async function runCli({
  states = [true, false],
  balance = 3200000,
  badRemote = -1,
  invalidAccount = -1,
  execute = true,
} = {}) {
  const root = path.resolve(__dirname, "../..");
  const reportPath = path.join(
    root,
    `verification/tokens-${network}${execute ? "" : "-preflight"}.json`,
  );
  const files = new Map();
  const put = (file, data) => files.set(file, JSON.stringify(data));
  put(path.join(root, "app/public/tokens/registry.json"), registry);
  put("/virtual/.config/solana/id.json", [0]);
  previousPreflight.tokens.forEach((t, i) =>
    put(
      `/virtual/.config/music-solana/tokens/${network}/${t.symbol.toLowerCase()}.json`,
      [i + 1],
    ),
  );
  const prior = {
    network,
    owner,
    program,
    checkedAt: "2026-11-04T00:00:00Z",
    tokens: registry.tokens.map((t, i) => ({
      symbol: t.symbol,
      mint: expected(i).mint,
      transactions: i === 0 ? [{ signature: "original-create" }] : [],
    })),
  };
  if (execute) put(reportPath, prior);
  const accounts = states.map((s, i) =>
    s === false ? null : mintAccount(i, s === true),
  );
  if (invalidAccount >= 0)
    accounts[invalidAccount].data.parsed.info.supply = "100";
  const events = [];
  const fakeProcess = {
    argv: [
      "node",
      "tokens.cjs",
      `--network=${network}`,
      ...(execute ? ["--execute"] : []),
    ],
    env: {},
    exitCode: 0,
  };
  const fakeFetch = async (url, options) => {
    if (url.includes("musicsolana.web.app")) {
      const i = url.endsWith("msix.json") ? 0 : 1;
      events.push(`metadata:${i}`);
      const json = JSON.parse(
        files.get(
          path.join(
            root,
            `app/public/tokens/mainnet/${registry.tokens[i].symbol.toLowerCase()}.json`,
          ),
        ),
      );
      if (i === badRemote) json.symbol = "MISMATCH";
      // Object key order is not part of metadata identity.
      return {
        ok: true,
        json: async () => Object.fromEntries(Object.entries(json).reverse()),
      };
    }
    const { method, params } = JSON.parse(options.body);
    let result;
    if (method === "getGenesisHash")
      result = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
    else if (method === "getBalance") result = { value: balance };
    else if (method === "getAccountInfo")
      result = {
        value:
          accounts[
            previousPreflight.tokens.findIndex((t) => t.mint === params[0])
          ],
      };
    else if (method === "getMinimumBalanceForRentExemption")
      result = previousPreflight.rentQuotes.find(
        (q) => q.space === params[0],
      ).rentLamports;
    else throw new Error(`Unexpected RPC method: ${method}`);
    return { ok: true, json: async () => ({ result }) };
  };
  const modules = {
    "node:fs": {
      mkdirSync() {},
      existsSync: (f) => files.has(f),
      readFileSync: (f) => {
        assert.ok(files.has(f), f);
        return files.get(f);
      },
      writeFileSync: (f, content) => files.set(f, content),
      renameSync: (a, b) => {
        files.set(b, files.get(a));
        files.delete(a);
      },
    },
    "node:path": path,
    "node:os": { homedir: () => "/virtual" },
    "node:child_process": {
      execFileSync: (_binary, args) => {
        const create = args.includes("create-token");
        const i = create
          ? args.at(-1).endsWith("msix.json")
            ? 0
            : 1
          : previousPreflight.tokens.findIndex((t) => args.includes(t.mint));
        assert.ok(i >= 0);
        events.push(`${create ? "create" : "initialize"}:${i}`);
        accounts[i] = mintAccount(i, !create);
        return JSON.stringify({
          signature: `${create ? "create" : "metadata"}-${i}`,
        });
      },
    },
    "../app/node_modules/@solana/web3.js": {
      Keypair: {
        fromSecretKey: (bytes) => ({
          publicKey: {
            toBase58: () =>
              bytes[0] === 0 ? owner : expected(bytes[0] - 1).mint,
          },
        }),
        generate: () => {
          throw new Error("Unexpected new key generation");
        },
      },
    },
    "../app/public/legal/operator.json": operator,
    "./token-layout.cjs": layout,
    "./token-deployment.cjs": helpers,
  };
  const errors = [];
  await vm.runInNewContext(
    fs.readFileSync(path.join(root, "scripts/tokens.cjs"), "utf8"),
    {
      require: (name) => {
        assert.ok(name in modules, name);
        return modules[name];
      },
      __dirname: path.join(root, "scripts"),
      process: fakeProcess,
      fetch: fakeFetch,
      Uint8Array,
      AbortSignal,
      console: { log() {}, error: (error) => errors.push(error) },
    },
  );
  return {
    exitCode: fakeProcess.exitCode,
    report: JSON.parse(files.get(reportPath)),
    events,
    errors,
  };
}

test("real script resumes one missing identity with residual funds and preserves its earlier receipt", async () => {
  const result = await runCli();
  assert.equal(result.exitCode, 0, result.errors.join());
  assert.deepEqual(result.events, [
    "metadata:0",
    "metadata:1",
    "create:1",
    "initialize:1",
  ]);
  assert.deepEqual(result.report.tokens[0].transactions, [
    { signature: "original-create" },
  ]);
  assert.equal(result.report.tokens[1].transactions.length, 2);
  assert.equal(result.report.remainingAfterRun.transactionsRemaining, 0);
});

test("real script performs no writes if the second public metadata document mismatches", async () => {
  const result = await runCli({
    states: [false, false],
    balance: 10000000,
    badRemote: 1,
  });
  assert.equal(result.exitCode, 1);
  assert.deepEqual(result.events, ["metadata:0", "metadata:1"]);
  assert.deepEqual(result.report.tokens[0].transactions, [
    { signature: "original-create" },
  ]);
});

test("real script refuses a mutated second mint before writing the first", async () => {
  const result = await runCli({
    states: [false, true],
    balance: 10000000,
    invalidAccount: 1,
  });
  assert.equal(result.exitCode, 1);
  assert.deepEqual(result.events, []);
});

test("real script initializes only missing metadata and accepts a completed zero-balance rerun", async () => {
  const partial = await runCli({ states: [true, "partial"], balance: 650000 });
  assert.equal(partial.exitCode, 0, partial.errors.join());
  assert.deepEqual(partial.events, [
    "metadata:0",
    "metadata:1",
    "initialize:1",
  ]);
  const done = await runCli({ states: [true, true], balance: 0 });
  assert.equal(done.exitCode, 0, done.errors.join());
  assert.deepEqual(done.events, ["metadata:0", "metadata:1"]);
  assert.equal(done.report.requiredBalanceWithHeadroomLamports, 0);
});

test("real script preflight never invokes the signing CLI", async () => {
  const result = await runCli({
    states: [false, false],
    balance: 0,
    execute: false,
  });
  assert.equal(result.exitCode, 0, result.errors.join());
  assert.deepEqual(result.events, []);
  assert.equal(result.report.requiredBalanceWithHeadroomLamports, 5864480);
});
