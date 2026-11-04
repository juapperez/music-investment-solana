// Compare deployed pages, public token metadata and JS/CSS against this build.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const out = path.join(root, "app/out");
const site = "https://musicsolana.web.app";
const sha = (body) => crypto.createHash("sha256").update(body).digest("hex");
const entries = new Map();
for (const route of [
  "",
  "disclosures",
  "explore",
  "create",
  "project",
  "portfolio",
]) {
  const html = path.join(route, "index.html");
  entries.set("/" + (route ? route + "/" : ""), html);
  const content = fs.readFileSync(path.join(out, html), "utf8");
  for (const match of content.matchAll(
    /(?:src|href)="(\/_next\/static\/[^"?]+\.(?:js|css))"/g,
  ))
    entries.set(match[1], match[1].slice(1));
}
for (const file of [
  "tokens/registry.json",
  "tokens/devnet/msix.json",
  "tokens/devnet/msaf.json",
  "tokens/mainnet/msix.json",
  "tokens/mainnet/msaf.json",
  "tokens/msix.svg",
  "tokens/msaf.svg",
  "manifest.json",
  "sitemap.xml",
  "og-tokens.png",
  "market/msix-history.json",
])
  entries.set("/" + file, file);
(async () => {
  const checks = [];
  const queue = Array.from(entries);
  await Promise.all(
    Array.from({ length: 5 }, async () => {
      while (queue.length) {
        const [route, file] = queue.shift();
        const response = await fetch(site + route, {
          signal: AbortSignal.timeout(30000),
          headers: { "Cache-Control": "no-cache" },
        });
        const body = Buffer.from(await response.arrayBuffer());
        const localSha = sha(fs.readFileSync(path.join(out, file)));
        const remoteSha = sha(body);
        if (response.status !== 200 || localSha !== remoteSha)
          throw new Error(
            `Production content mismatch: ${route} (${response.status})`,
          );
        checks.push({ route, status: response.status, sha256: remoteSha });
      }
    }),
  );
  const home = await fetch(site, { signal: AbortSignal.timeout(20000) });
  if (
    home.headers.get("x-content-type-options") !== "nosniff" ||
    !home.headers
      .get("content-security-policy")
      ?.includes("frame-ancestors 'none'")
  )
    throw new Error("Security headers missing");
  const missing = await fetch(
    site + "/nonexistent-token-release-check-20261104",
    { signal: AbortSignal.timeout(20000) },
  );
  if (missing.status !== 404) throw new Error("Unknown route must return 404");
  const report = {
    checkedAt: new Date().toISOString(),
    site,
    verifiedFiles: checks.length,
    unknownRouteStatus: missing.status,
    securityHeadersVerified: true,
    checks: checks.sort((a, b) => a.route.localeCompare(b.route)),
  };
  fs.writeFileSync(
    path.join(root, "verification/tokens-hosting-readback.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      site,
      verifiedFiles: checks.length,
      unknownRouteStatus: missing.status,
      securityHeadersVerified: true,
    }),
  );
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
