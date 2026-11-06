// Real local-program transactions with a disposable Phantom test adapter.
// All browser network traffic is restricted to loopback; no real wallet profile.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { chromium } = require("playwright");
const anchor = require("@coral-xyz/anchor");
const { IDL, PROGRAM_ID } = require("../src/utils/idl.ts");
const { Connection, Keypair, PublicKey, SystemProgram, Transaction } = anchor.web3;
const app = path.resolve(__dirname, "..");
const reportDir = path.resolve(app, "../verification");
const fixturePath = process.env.MUSIC_SOLANA_REFUND_FIXTURE;
if (!fixturePath) throw new Error("Run npm run test:refund-ui to create disposable fixtures");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const keys = Object.fromEntries(["artist", "investor", "second", "stranger"].map(name =>
  [name, Keypair.fromSecretKey(Uint8Array.from(fixture[name]))]));
const connection = new Connection("http://127.0.0.1:8899", "confirmed");
const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(keys.artist), { commitment: "confirmed" });
const program = new anchor.Program(IDL, new PublicKey(PROGRAM_ID), provider);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const checks = [];
const signatures = [];
let redirectedReadRequests = 0;
let externalFontStylesStubbed = 0;
const blockedRequests = [];
const pageErrors = [];
const rpcReads = new Set(["getAccountInfo", "getMultipleAccounts", "getProgramAccounts", "getBalance", "getSlot", "getBlockHeight", "getLatestBlockhash", "getVersion", "getGenesisHash"]);

function accounts(title, who = "investor") {
  const [project] = PublicKey.findProgramAddressSync([Buffer.from("project"), keys.artist.publicKey.toBuffer(), Buffer.from(title)], program.programId);
  const [vault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), project.toBuffer()], program.programId);
  const [investment] = PublicKey.findProgramAddressSync([Buffer.from("investment"), project.toBuffer(), keys[who].publicKey.toBuffer()], program.programId);
  return { project, vault, investment, investor: keys[who].publicKey, systemProgram: SystemProgram.programId };
}
async function create(title, sharesBought) {
  const a = accounts(title);
  await program.methods.createProject(title, "Disposable browser test", new anchor.BN(10000001), new anchor.BN(3), 3000)
    .accounts({ ...a, artist: keys.artist.publicKey }).rpc();
  if (sharesBought) await program.methods.invest(new anchor.BN(sharesBought)).accounts(a).signers([keys.investor]).rpc();
  return a;
}
async function until(fn, label) {
  const end = Date.now() + 30000;
  while (Date.now() < end) {
    if (await fn()) return;
    await pause(150);
  }
  throw new Error("Timeout: " + label);
}
async function check(name, fn) { await fn(); checks.push(name); console.log("PASS " + name); }

async function browserPage(browser, role, production = false, width = 1200) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: "block" });
  const controls = { rejectNext: false, signatures: 0 };
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1") return route.continue();
    if (url.origin === "https://fonts.googleapis.com" && url.pathname === "/css2") {
      externalFontStylesStubbed++;
      return route.fulfill({ status: 200, contentType: "text/css", body: "/* Offline browser suite uses the site's fallback fonts. */" });
    }
    if (production && url.origin === "https://api.devnet.solana.com") {
      const body = route.request().postDataJSON();
      assert.equal(Array.isArray(body), false);
      assert.ok(rpcReads.has(body.method), "Production preview cannot send transactions");
      redirectedReadRequests++;
      const response = await fetch("http://127.0.0.1:8899", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      return route.fulfill({ status: 200, contentType: "application/json", body: await response.text() });
    }
    blockedRequests.push(url.origin + url.pathname);
    return route.abort();
  });
  await context.routeWebSocket("**", socket => {
    if (new URL(socket.url()).hostname === "127.0.0.1") socket.connectToServer();
    else { blockedRequests.push(socket.url()); socket.close(); }
  });
  if (role) {
    await context.exposeBinding("__signLocalTransaction", async ({ page }, bytes) => {
      assert.equal(production, false, "No production signing");
      assert.equal(new URL(page.url()).origin, "http://127.0.0.1:4174");
      controls.signatures++;
      if (controls.rejectNext) { controls.rejectNext = false; throw new Error("User rejected local test transaction"); }
      const tx = Transaction.from(Buffer.from(bytes));
      assert.ok(tx.feePayer.equals(keys[role].publicKey));
      assert.ok(tx.instructions.every(ix => ix.programId.equals(program.programId)));
      tx.partialSign(keys[role]);
      return Array.from(tx.signatures.find(entry => entry.publicKey.equals(keys[role].publicKey)).signature);
    });
    await context.addInitScript(({ publicBytes, publicText }) => {
      localStorage.setItem("walletName", JSON.stringify("Phantom"));
      const listeners = new Map();
      const wallet = {
        isPhantom: true, isConnected: false,
        publicKey: { toBytes: () => Uint8Array.from(publicBytes), toString: () => publicText },
        on(name, callback) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(callback); },
        off(name, callback) { listeners.get(name)?.delete(callback); },
        async connect() { this.isConnected = true; return { publicKey: this.publicKey }; },
        async disconnect() { this.isConnected = false; for (const callback of listeners.get("disconnect") || []) callback(); },
        async signTransaction(tx) {
          const signature = await window.__signLocalTransaction(Array.from(tx.serialize({ requireAllSignatures: false, verifySignatures: false })));
          tx.addSignature(tx.feePayer, Uint8Array.from(signature));
          return tx;
        },
        async signAllTransactions(txs) { return Promise.all(txs.map(tx => this.signTransaction(tx))); },
      };
      window.isPhantomInstalled = true;
      window.phantom = { solana: wallet };
      window.solana = wallet;
    }, { publicBytes: Array.from(keys[role].publicKey.toBytes()), publicText: keys[role].publicKey.toBase58() });
  }
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on("pageerror", error => pageErrors.push(error.message));
  return { context, page, controls, production, role };
}
async function visit(view, a) {
  await view.page.goto(`http://127.0.0.1:${view.production ? 4173 : 4174}/project/?id=${a.project}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  if (view.role) await until(() => view.page.locator(".wallet-adapter-button-trigger").innerText().then(text => text.includes("..")), "wallet connected");
  await view.page.getByTestId("project-status").waitFor();
}
async function absent(page, id) { assert.equal(await page.getByTestId(id).count(), 0, id + " absent"); }
async function assertNoActions(view) {
  await absent(view.page, "cancel-campaign");
  await absent(view.page, "refund-contribution");
}
async function receipt(page) {
  await page.getByTestId("refund-receipt").waitFor();
  const signature = await page.getByTestId("refund-receipt").locator("code").innerText();
  const result = await connection.getSignatureStatus(signature);
  assert.equal(result.value.err, null);
  assert.ok(["confirmed", "finalized"].includes(result.value.confirmationStatus));
  signatures.push(signature);
  return signature;
}

(async () => {
  assert.ok(fs.existsSync(path.join(app, "out/project/index.html")), "Build production first, with NEXT_PUBLIC_REFUND_PREVIEW=local to challenge the production gate");
  const staticServer = http.createServer((req, res) => {
    const relative = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
    let file = path.resolve(app, "out", "." + relative);
    if (!file.startsWith(path.join(app, "out") + path.sep)) { res.writeHead(403); return res.end(); }
    try {
      if (fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
      const type = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" }[path.extname(file)] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
      res.end(fs.readFileSync(file));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => staticServer.listen(4173, "127.0.0.1", resolve));
  const log = fs.openSync(path.join(path.dirname(fixturePath), "next-preview.log"), "w", 0o600);
  const generatedPaths = ["next-env.d.ts", "tsconfig.json"].map(file => path.join(app, file));
  const beforeGenerated = generatedPaths.map(file => fs.readFileSync(file, "utf8"));
  let afterGenerated;
  const next = spawn(process.execPath, [path.join(app, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", "4174"], {
    cwd: app, env: { ...process.env, NODE_ENV: "development", NEXT_PUBLIC_REFUND_PREVIEW: "local", NEXT_TELEMETRY_DISABLED: "1" }, stdio: ["ignore", log, log],
  });
  let browser;
  try {
    await until(async () => {
      if (next.exitCode !== null) throw new Error("Next preview server exited; inspect private diagnostic log");
      try { return (await fetch("http://127.0.0.1:4174/project/", { signal: AbortSignal.timeout(1000) })).ok; } catch { return false; }
    }, "local preview startup");
    afterGenerated = generatedPaths.map(file => fs.readFileSync(file, "utf8"));
    browser = await chromium.launch({ headless: true, channel: "chrome" });
    const title = "UI cancel " + Date.now();
    const a = await create(title, 1);
    const active = await create("UI active " + Date.now(), 1);
    const funded = await create("UI funded " + Date.now(), 3);
    const expired = accounts(fixture.expiredTitle);
    const artist = await browserPage(browser, "artist");
    const investor = await browserPage(browser, "investor");
    const stranger = await browserPage(browser, "stranger");
    const disconnected = await browserPage(browser, null);

    await check("active campaign exposes cancellation only to its artist and no premature refunds", async () => {
      await visit(artist, a);
      await artist.page.getByTestId("cancel-campaign").waitFor();
      await absent(artist.page, "refund-contribution");
      for (const view of [investor, stranger, disconnected]) { await visit(view, a); await assertNoActions(view); }
    });
    await check("wallet rejection keeps campaign active and the confirmation can be retried", async () => {
      await artist.page.getByTestId("cancel-campaign").click();
      artist.controls.rejectNext = true;
      await artist.page.getByRole("button", { name: "Confirmar cancelación", exact: true }).click();
      await artist.page.getByText("User rejected local test transaction", { exact: true }).waitFor();
      assert.deepEqual((await program.account.project.fetch(a.project)).status, { active: {} });
      await absent(artist.page, "refund-receipt");
    });
    await check("artist cancellation is confirmed on-chain and displays a verifiable receipt", async () => {
      await artist.page.getByRole("button", { name: "Confirmar cancelación", exact: true }).click();
      await receipt(artist.page);
      assert.deepEqual((await program.account.project.fetch(a.project)).status, { cancelled: {} });
      await assertNoActions(artist);
      assert.equal(artist.controls.signatures, 2);
    });
    await check("contributor refund returns exact principal and rent minus actual fee; repeat action disappears", async () => {
      await visit(investor, a);
      await investor.page.getByTestId("refund-contribution").waitFor();
      investor.controls.rejectNext = true;
      await investor.page.getByTestId("refund-contribution").click();
      await investor.page.getByText("User rejected local test transaction", { exact: true }).waitFor();
      const principal = (await program.account.investment.fetch(a.investment)).amountInvested.toNumber();
      const rent = await connection.getBalance(a.investment);
      const before = await connection.getBalance(keys.investor.publicKey);
      await investor.page.getByTestId("refund-contribution").click();
      const signature = await receipt(investor.page);
      const tx = await connection.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
      assert.ok(tx && tx.meta);
      assert.equal((await connection.getBalance(keys.investor.publicKey)) - before, principal + rent - tx.meta.fee);
      assert.equal(await connection.getAccountInfo(a.investment), null);
      assert.equal((await program.account.project.fetch(a.project)).amountRaised.toString(), "0");
      await absent(investor.page, "refund-contribution");
      for (const view of [stranger, disconnected]) { await visit(view, a); await assertNoActions(view); }
    });
    await check("portfolio removes a closed contribution and preserves other investments", async () => {
      await investor.page.goto("http://127.0.0.1:4174/portfolio/");
      await investor.page.getByText(fixture.expiredTitle, { exact: true }).waitFor();
      assert.equal(await investor.page.getByText(title, { exact: true }).count(), 0);
    });
    await check("expiry disables purchases and a mobile English contributor can refund without artist cooperation", async () => {
      await investor.page.setViewportSize({ width: 390, height: 844 });
      await visit(investor, expired);
      await investor.page.getByTestId("funding-expired").waitFor();
      assert.equal(await investor.page.locator('input[type="number"]').count(), 0);
      await investor.page.getByRole("button", { name: "Switch to English" }).click();
      await investor.page.getByRole("button", { name: "Refund test contribution" }).waitFor();
      await investor.page.screenshot({ path: path.join(reportDir, "refund-ui-mobile.png"), fullPage: true });
      assert.equal(await investor.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
      await investor.page.getByTestId("refund-contribution").click();
      await receipt(investor.page);
      assert.equal(await connection.getAccountInfo(expired.investment), null);
      await investor.page.setViewportSize({ width: 320, height: 800 });
      assert.equal(await investor.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
      await investor.page.screenshot({ path: path.join(reportDir, "refund-ui-receipt.png"), fullPage: true });
    });
    await check("funded and released campaigns expose no cancellation or refund actions", async () => {
      for (const view of [artist, investor]) { await visit(view, funded); await assertNoActions(view); }
      await program.methods.withdrawFunds().accounts({ ...funded, artist: keys.artist.publicKey }).rpc();
      for (const view of [artist, investor]) { await visit(view, funded); await assertNoActions(view); }
    });
    await check("production build ignores the local flag and exposes no undeployed controls for eligible accounts", async () => {
      for (const [role, project] of [["artist", active], ["investor", active], ["second", expired]]) {
        const view = await browserPage(browser, role, true, 390);
        await visit(view, project);
        await assertNoActions(view);
        await absent(view.page, "local-refund-notice");
        assert.equal(await view.page.locator(".refund-panel").count(), 0);
        if (role === "investor") await view.page.locator('input[type="number"]').waitFor();
        assert.match(await view.page.locator(".network-notice").innerText(), /devnet/);
        await view.context.close();
      }
      assert.ok(redirectedReadRequests > 0, "Production endpoint remained devnet; only read RPC requests were redirected to local fixtures");
    });
    await check("headless suite made no external network requests and raised no browser errors", async () => {
      assert.deepEqual(blockedRequests, []);
      assert.deepEqual(pageErrors, []);
    });
    fs.writeFileSync(path.join(reportDir, "refunds-ui.json"), JSON.stringify({ checkedAt: new Date().toISOString(), checks, localSignatures: signatures,
      browser: "Chrome headless with disposable contexts", productionGateTest: "Production build compiled with NEXT_PUBLIC_REFUND_PREVIEW=local; remote read RPC intercepted with local fixtures",
      redirectedReadRequests, externalFontStylesStubbed, blockedRequests, pageErrors, realPrivateKeysRead: false, publicNetworkTransactions: 0, publicNetworkFeesSpent: false,
      screenshots: ["refund-ui-mobile.png", "refund-ui-receipt.png"] }, null, 2) + "\n");
  } finally {
    if (browser) await browser.close();
    if (next.exitCode === null && next.signalCode === null) {
      const stopped = once(next, "exit"); next.kill("SIGTERM");
      await Promise.race([stopped, pause(5000)]);
      if (next.exitCode === null && next.signalCode === null) { next.kill("SIGKILL"); await stopped; }
    }
    fs.closeSync(log);
    // Next changes these for its separate dev output. Restore only our generated
    // changes; preserve any concurrent user edit made after server startup.
    if (afterGenerated) generatedPaths.forEach((file, i) => {
      if (fs.readFileSync(file, "utf8") === afterGenerated[i]) fs.writeFileSync(file, beforeGenerated[i]);
    });
    await new Promise(resolve => staticServer.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
