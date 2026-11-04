const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = process.env.MUSIC_SOLANA_QA_URL || "http://127.0.0.1:4173";
const output = path.resolve(__dirname, "../../verification");
(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  const checks = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (name, fn) =>
    fn().then(() => {
      checks.push({ name, passed: true });
      console.log("PASS: " + name);
    });
  try {
    await page.goto(base, { waitUntil: "networkidle" });
    await check(
      "Spanish home, both product identities and prelaunch status",
      async () => {
        assert.match(await page.title(), /Music Index & Artist Fund/);
        assert.match(await page.locator("h1").innerText(), /La música mueve/);
        assert.equal(await page.locator(".token-card").count(), 2);
        assert.equal(
          await page.locator(".small-tag").first().innerText(),
          "En preparación",
        );
      },
    );
    await check(
      "Index uses dated underlying history and allows restoring it",
      async () => {
        const snapshot = await (
          await page.request.get(base + "/market/msix-history.json")
        ).json();
        for (const asset of snapshot.assets)
          assert.equal(
            await page.getByLabel(asset.ticker + " retorno anual").inputValue(),
            asset.annualizedReturnPct.toFixed(4),
          );
        assert.match(
          await page.locator(".history-mode").innerText(),
          /Histórico de acciones subyacentes/,
        );
        const before = await page.getByTestId("net-return").innerText();
        await page.getByRole("button", { name: "Ilustrativo 8%" }).click();
        assert.match(await page.getByTestId("net-return").innerText(), /6,52%/);
        await page.getByRole("button", { name: "Usar histórico" }).click();
        assert.equal(await page.getByTestId("net-return").innerText(), before);
      },
    );
    await page.screenshot({
      path: path.join(output, "tokens-desktop.png"),
      fullPage: true,
    });
    await page.screenshot({ path: path.join(output, "tokens-hero.png") });
    await check("Negative scenario is displayed as a loss", async () => {
      await page.getByRole("button", { name: "Adverso −30%" }).click();
      await page.waitForFunction(() =>
        document
          .querySelector('[data-testid="net-return"]')
          .textContent.includes("-"),
      );
    });
    await check(
      "Invalid capital clears results and gives an error",
      async () => {
        await page.getByLabel("Capital hipotético (USD)").fill("0");
        await page.locator('.calc-error[role="alert"]').waitFor();
        assert.equal(await page.getByTestId("end-value").count(), 0);
        await page.getByLabel("Capital hipotético (USD)").fill("1000");
      },
    );
    await check("Artist strategy applies its own costs", async () => {
      await page.getByRole("button", { name: "MSAF · Artist Fund" }).click();
      await page.waitForFunction(() =>
        document
          .querySelector('[data-testid="net-return"]')
          .textContent.includes("5,72%"),
      );
      assert.equal(
        await page.getByLabel("Administración anual (%)").inputValue(),
        "2",
      );
    });
    await check("English switch persists after reload", async () => {
      await page.getByRole("button", { name: "Switch to English" }).click();
      assert.match(await page.locator("h1").innerText(), /Music moves/);
      await page.reload({ waitUntil: "networkidle" });
      assert.match(await page.locator("h1").innerText(), /Music moves/);
      assert.equal(await page.locator("html").getAttribute("lang"), "en");
    });
    await check("FAQ expands and disclosures are reachable", async () => {
      await page
        .locator("summary")
        .filter({ hasText: "Can I buy the tokens now?" })
        .click();
      assert.match(
        await page.locator(".faq-list details[open]").innerText(),
        /Not yet/,
      );
      await page
        .getByRole("link", { name: "Full disclosures & risks" })
        .click();
      await page
        .getByRole("heading", { name: "Disclosures & risks" })
        .waitFor();
      assert.match(
        await page.locator("body").innerText(),
        /Real investments are not accepted/,
      );
      assert.equal(
        await page.locator("#operator-heading").innerText(),
        "PDEVELOP LLC",
      );
      assert.match(
        await page.locator(".operator-identity").innerText(),
        /New Mexico/,
      );
      assert.equal(
        await page.getByText("Awaiting confirmation", { exact: true }).count(),
        0,
      );
      const structured = JSON.parse(
        await page.locator('script[type="application/ld+json"]').textContent(),
      );
      assert.equal(
        structured["@graph"].find((item) => item["@type"] === "Organization")
          .legalName,
        "PDEVELOP LLC",
      );
    });
    await check(
      "Public metadata and registry match verified devnet mints",
      async () => {
        const registry = await (
          await page.request.get(base + "/tokens/registry.json")
        ).json();
        for (const token of registry.tokens) {
          assert.ok(token.devnet?.mint);
          assert.equal(token.devnet.supply, "0");
          const metadata = await (
            await page.request.get(
              base + `/tokens/devnet/${token.symbol.toLowerCase()}.json`,
            )
          ).json();
          assert.equal(metadata.symbol, token.symbol);
          assert.match(metadata.name, /Test$/);
          assert.equal(metadata.issuer.name, "PDEVELOP LLC");
          assert.equal(metadata.issuer.country, "US");
        }
      },
    );
    await check(
      "Devnet routes stay separate and remain available",
      async () => {
        for (const route of ["/explore/", "/create/", "/portfolio/"]) {
          await page.goto(base + route, { waitUntil: "domcontentloaded" });
          await page.locator(".network-notice").waitFor();
          assert.match(
            await page.locator(".network-notice").innerText(),
            /Devnet lab|Laboratorio devnet/,
          );
          assert.ok(
            (
              await page.locator('meta[name="robots"]').getAttribute("content")
            ).includes("noindex"),
          );
        }
      },
    );
    await check(
      "Desktop and mobile fit viewport with working navigation",
      async () => {
        await page.goto(base, { waitUntil: "networkidle" });
        await page.getByRole("button", { name: "Cambiar a español" }).click();
        for (const width of [1440, 768, 390, 320]) {
          await page.setViewportSize({ width, height: 844 });
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
            `overflow at ${width}`,
          );
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({
          path: path.join(output, "tokens-mobile.png"),
          fullPage: true,
        });
        await page.screenshot({
          path: path.join(output, "tokens-mobile-hero.png"),
        });
        await page
          .getByRole("link", { name: "Explorar los tokens", exact: true })
          .click();
        await page.locator("#tokens").waitFor();
        await page
          .getByRole("link", { name: "Simular el índice", exact: true })
          .click();
        assert.equal(
          await page
            .getByRole("button", { name: "MSIX · Music Index" })
            .getAttribute("aria-pressed"),
          "true",
        );
        await page.screenshot({
          path: path.join(output, "tokens-mobile-calculator.png"),
        });
      },
    );
    assert.deepEqual(errors, []);
    checks.push({ name: "No uncaught browser errors", passed: true });
    const report = {
      checkedAt: new Date().toISOString(),
      base,
      checks,
      errors,
    };
    fs.writeFileSync(
      path.join(output, "tokens-web-qa.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
