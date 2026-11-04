# Music Solana

Production website: **https://musicsolana.web.app** (Firebase project `musicsolana`).

The home presents two proposed products:

- **MSIX — Music Solana Index:** a proposed basket of tokenized music-related equities. Variable total return less purchase, network, indexing and rebalancing costs; no fixed APY.
- **MSAF — Music Solana Artist Fund:** a proposed private music-project strategy. The displayed 8% gross annual scenario is an editable illustration, not a forecast, market average, fund track record or promised yield.

**The website is not an operational investment offering.** No backing assets, legal rights, subscriptions, token redemptions or distributions have been established for these products. Both Token-2022 identities are verified on **devnet**, with zero supply and default-frozen accounts. Mainnet creation awaits gas; real investing additionally requires the operating entity/jurisdiction, provider/custody and artist contracts. Issuer mint, freeze and metadata authorities are retained.

The transparent scenario calculator runs in the browser, includes negative outcomes, and labels its fees as editable assumptions. External references are dated and linked, separate from token performance. English and Spanish are available; Spanish is the initial language.

The existing project-funding preview remains at `/explore/` on **Solana devnet**. It uses test SOL, with no monetary value. Its project shares are Anchor records, not either of the two tokens. Revenue deposited by artists can be claimed proportionally; platform royalties are not collected automatically. Partially funded projects have no automatic refunds. This legacy program is not ready for real money.

- Web: Next.js 15 / React 19; `music-investment/app`.
- Project demo: Anchor; `music-investment/programs/music_investment`.
- Token tooling: `music-investment/scripts/tokens.cjs`.
- Public token registry and metadata: `music-investment/app/public/tokens`.
- Verification: `music-investment/verification/tokens-*.json`.

See [development and verification](music-investment/README.md).
