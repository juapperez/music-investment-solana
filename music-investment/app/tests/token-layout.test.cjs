const { test } = require("node:test");
const assert = require("node:assert/strict");
const { tokenMetadata, mintSpace } = require("../../scripts/token-layout.cjs");
const registry = require("../public/tokens/registry.json");
test("rent layout matches sizes read from the two deployed devnet accounts", () => {
  assert.deepEqual(
    registry.tokens.map((token) => mintSpace(tokenMetadata(token, "devnet"))),
    [401, 407],
  );
});
test("mainnet metadata uses network-specific URIs and sizes", () => {
  assert.deepEqual(
    registry.tokens.map((token) =>
      mintSpace(tokenMetadata(token, "mainnet-beta")),
    ),
    [397, 403],
  );
  for (const token of registry.tokens) {
    const m = tokenMetadata(token, "mainnet-beta");
    assert.equal(m.name, token.name);
    assert.match(m.uri, /\/mainnet\//);
    assert.equal(m.symbol, token.symbol);
  }
});
test("rent sizing counts UTF-8 bytes, not characters", () => {
  const base = { name: "a", symbol: "A", uri: "https://example.com/a" };
  assert.equal(mintSpace({ ...base, name: "🎵" }) - mintSpace(base), 3);
});
