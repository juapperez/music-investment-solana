// Token-2022 mint with default-frozen accounts, metadata pointer, and embedded
// metadata. Includes account-type padding and TLV headers; no extra fields.
function tokenMetadata(token, network) {
  const shortNetwork = network === "devnet" ? "devnet" : "mainnet";
  return {
    name: network === "devnet" ? `${token.name} Test` : token.name,
    symbol: token.symbol,
    uri: `https://musicsolana.web.app/tokens/${shortNetwork}/${token.symbol.toLowerCase()}.json`,
  };
}
function mintSpace(metadata) {
  // 166 base/padding + 5 default-state + 68 pointer + 4 metadata TLV
  // + 64 authority/mint + 12 string lengths + 4 empty key/value vector.
  return (
    323 +
    Buffer.byteLength(metadata.name) +
    Buffer.byteLength(metadata.symbol) +
    Buffer.byteLength(metadata.uri)
  );
}
module.exports = { tokenMetadata, mintSpace };
