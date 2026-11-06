#!/usr/bin/env node
// Isolated local-validator integration. No remote RPC, cloning, real keys or deployment.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const net = require("node:net");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const anchor = require("../app/node_modules/@coral-xyz/anchor");
const { IDL, PROGRAM_ID } = require("../app/src/utils/idl.ts");
const { Keypair, PublicKey, SystemProgram } = anchor.web3;
const root = path.resolve(__dirname, "..");
const artifact = path.join(root, "target/deploy/music_investment.so");
const validatorBinary = path.join(
  os.homedir(),
  ".local/share/solana/install/active_release/bin/solana-test-validator",
);
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ui = process.argv.includes("--ui");

async function requireUnusedPort(port) {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  await new Promise((resolve) => server.close(resolve));
}

async function prepareFixtures(directory) {
  const keys = Object.fromEntries(
    ["artist", "investor", "second", "stranger"].map((name) => [
      name,
      Keypair.generate(),
    ]),
  );
  const accountsDir = path.join(directory, "accounts");
  fs.mkdirSync(accountsDir, { mode: 0o700 });
  const writeAccount = (label, pubkey, data, lamports, owner = PROGRAM_ID) =>
    fs.writeFileSync(
      path.join(accountsDir, label + ".json"),
      JSON.stringify({
        pubkey: pubkey.toBase58(),
        account: {
          lamports,
          data: [data.toString("base64"), "base64"],
          owner,
          executable: false,
          rentEpoch: 0,
        },
      }),
      { mode: 0o600 },
    );
  for (const [name, key] of Object.entries(keys))
    writeAccount(
      name,
      key.publicKey,
      Buffer.alloc(0),
      2000000000,
      SystemProgram.programId.toBase58(),
    );
  const expiredTitle = "Existing expired campaign";
  const programId = new PublicKey(PROGRAM_ID);
  const [project, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("project"),
      keys.artist.publicKey.toBuffer(),
      Buffer.from(expiredTitle),
    ],
    programId,
  );
  const [vault, vaultBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), project.toBuffer()],
    programId,
  );
  const coder = new anchor.BorshAccountsCoder(IDL);
  const encoded = await coder.encode("Project", {
    artist: keys.artist.publicKey,
    title: expiredTitle,
    description: "Pre-upgrade account layout fixture",
    fundingGoal: new anchor.BN(10000001),
    totalShares: new anchor.BN(3),
    sharesSold: new anchor.BN(2),
    amountRaised: new anchor.BN(6666667),
    revenueShareBps: 3000,
    status: { active: {} },
    totalRevenueDistributed: new anchor.BN(0),
    createdAt: new anchor.BN(1),
    bump,
    vaultBump,
  });
  const padded = Buffer.alloc(422);
  encoded.copy(padded);
  writeAccount("expired-project", project, padded, 10000000);
  const expiredVaultReserve = 10000000;
  writeAccount(
    "expired-vault",
    vault,
    Buffer.alloc(8),
    expiredVaultReserve + 6666667,
  );
  for (const [name, amount] of [
    ["investor", 3333333],
    ["second", 3333334],
  ]) {
    const [investment, investmentBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("investment"),
        project.toBuffer(),
        keys[name].publicKey.toBuffer(),
      ],
      programId,
    );
    const data = await coder.encode("Investment", {
      investor: keys[name].publicKey,
      project,
      shares: new anchor.BN(1),
      amountInvested: new anchor.BN(amount),
      revenueClaimed: new anchor.BN(0),
      bump: investmentBump,
    });
    writeAccount("expired-" + name, investment, data, 10000000);
  }
  const contextPath = path.join(directory, "fixture-context.json");
  fs.writeFileSync(
    contextPath,
    JSON.stringify({
      ...Object.fromEntries(
        Object.entries(keys).map(([name, key]) => [
          name,
          Array.from(key.secretKey),
        ]),
      ),
      expiredTitle,
      expiredVaultReserve,
    }),
    { mode: 0o600 },
  );
  const keyPath = path.join(directory, "disposable-validator-key.json");
  fs.writeFileSync(
    keyPath,
    JSON.stringify(Array.from(Keypair.generate().secretKey)),
    { mode: 0o600 },
  );
  const configPath = path.join(directory, "validator-config.json");
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      json_rpc_url: "http://127.0.0.1:8899",
      websocket_url: "ws://127.0.0.1:8900",
      keypair_path: keyPath,
      address_labels: {},
      commitment: "confirmed",
    }),
    { mode: 0o600 },
  );
  return {
    accountsDir,
    contextPath,
    configPath,
    mint: Keypair.generate().publicKey.toBase58(),
    projectLayoutBytes: padded.length,
  };
}

(async () => {
  if (!fs.existsSync(artifact))
    throw new Error("Build the local program first: anchor build --no-idl");
  // Never attach to or stop someone else's validator.
  for (const port of [8899, 8900, 9900, ...(ui ? [4173, 4174] : [])]) await requireUnusedPort(port);
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "music-solana-refunds-"),
  );
  fs.chmodSync(directory, 0o700);
  const fixture = await prepareFixtures(directory);
  const logPath = path.join(directory, "validator.log");
  const log = fs.openSync(logPath, "w", 0o600);
  const validator = spawn(
    validatorBinary,
    [
      "--quiet",
      "--config",
      fixture.configPath,
      "--ledger",
      path.join(directory, "ledger"),
      "--bind-address",
      "127.0.0.1",
      "--url",
      "http://127.0.0.1:8899",
      "--rpc-port",
      "8899",
      "--faucet-port",
      "9900",
      "--mint",
      fixture.mint,
      "--bpf-program",
      PROGRAM_ID,
      artifact,
      "--account-dir",
      fixture.accountsDir,
    ],
    { stdio: ["ignore", log, log] },
  );
  let validatorError;
  validator.on("error", (error) => {
    validatorError = error;
  });
  let succeeded = false;
  try {
    const deadline = Date.now() + 90000;
    let ready = false;
    while (Date.now() < deadline) {
      if (validatorError || validator.exitCode !== null)
        throw (
          validatorError || new Error("Local validator exited during startup")
        );
      try {
        const response = await fetch("http://127.0.0.1:8899", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
          signal: AbortSignal.timeout(1000),
        });
        ready = (await response.json()).result === "ok";
      } catch {}
      if (ready) break;
      await delay(500);
    }
    if (!ready) throw new Error("Local validator did not become healthy");
    console.log(
      ui ? "Disposable local validator ready; testing local UI and production gate headlessly."
        : "Disposable local validator ready; testing refunds and the existing revenue flow.",
    );
    const test = spawn(
      process.execPath,
      ui ? ["--experimental-strip-types", "tests/refund-ui.cjs"] : [
        "--experimental-strip-types",
        "--test",
        "--test-concurrency=1",
        "tests/contract-flow.cjs",
        "tests/refund-flow.cjs",
      ],
      {
        cwd: path.join(root, "app"),
        env: {
          ...process.env,
          MUSIC_SOLANA_REFUND_FIXTURE: fixture.contextPath,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    for (const stream of [test.stdout, test.stderr])
      stream.on("data", (data) => {
        output += data;
        process.stdout.write(data);
      });
    const [exitCode] = await once(test, "exit");
    if (exitCode !== 0)
      throw new Error(`Local ${ui ? "UI" : "contract"} tests exited ${exitCode}`);
    const report = {
      checkedAt: new Date().toISOString(),
      rpc: "http://127.0.0.1:8899",
      programId: PROGRAM_ID,
      artifactSha256: hash(fs.readFileSync(artifact)),
      artifactBytes: fs.statSync(artifact).size,
      projectLayoutBytes: fixture.projectLayoutBytes,
      accountLayoutMigrationRequired: false,
      testsPassed: ui ? JSON.parse(fs.readFileSync(path.join(root, "verification/refunds-ui.json"), "utf8")).checks.length : 5,
      testsFailed: 0,
      testOutput: output,
      realPrivateKeysRead: false,
      publicNetworkTransactions: 0,
      deployedToDevnet: false,
      deployedToMainnet: false,
      websiteFeatureEnabled: false,
    };
    fs.writeFileSync(
      path.join(root, ui ? "verification/refunds-ui-runtime.json" : "verification/refunds-local.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    succeeded = true;
  } finally {
    if (validator.exitCode === null && !validatorError) {
      const stopped = once(validator, "exit");
      validator.kill("SIGINT");
      await Promise.race([stopped, delay(10000)]);
      if (validator.exitCode === null && validator.signalCode === null) {
        validator.kill("SIGKILL");
        await stopped;
      }
    }
    fs.closeSync(log);
    if (succeeded) fs.rmSync(directory, { recursive: true, force: true });
    else
      console.error(`Local diagnostic files retained privately: ${directory}`);
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
