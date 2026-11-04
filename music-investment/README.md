# Music Solana development

## Scope

This application uses devnet only. It records project shares in Anchor accounts, without issuing tradable tokens. An artist's revenue percentage is descriptive: the program can distribute only SOL the artist actually deposits. It cannot enforce off-chain royalty collection or music ownership.

## Accounts and transactions

`Project` stores the artist, title, description, goal, share allocation, raised principal, revenue, status and PDA bumps. `Investment` stores a supporter's shares, contribution and claimed revenue. The project's vault holds funding and revenue separately in the accounting rules.

1. Create a project with a title of 1–32 UTF-8 bytes and a description of 1–256 bytes.
2. Buy a positive integer number of shares. Cumulative integer pricing reaches the exact funding goal even when the goal is not divisible by the share count.
3. After all shares sell, the artist may withdraw only the funding principal. Deposited investor revenue stays in the vault.
4. The artist may deposit revenue for a funded or released project.
5. Investors claim their proportional deposited revenue, less their earlier claims. Authorization, availability, overflow and repeated-claim checks run on-chain.

The web app uses integer lamports for amounts, shows validation and RPC errors, and preserves the selected language. A connected wallet must approve every transaction.

## Development

Use Node.js 24+, Rust, Solana CLI and Anchor CLI 0.32.1. Never commit wallet keys or use a wallet holding real funds for this preview.

```sh
cd app
npm ci
npm test
npm run typecheck
npm run build
npm run dev
```

Contract checks from this directory:

```sh
cargo test --lib
anchor build --no-idl
```

For integration tests, start a disposable local validator with the compiled program loaded at the configured devnet program ID:

```sh
solana-test-validator --reset --ledger /tmp/music-solana-test-ledger --bpf-program 7gyrL4T4kUXQwpGuU95QnwUsdVJ1Z5AhGeXrHY63PiwK target/deploy/music_investment.so
cd app
npm run test:contract
```

The integration test hardcodes localhost and generates disposable keys. It covers grouped purchases, over-allocation rejection, revenue deposited before artist withdrawal, unauthorized withdrawal, exact principal withdrawal, revenue claims and repeated-claim rejection.

## Hosting and verification

Firebase project: `musicsolana`. Build `app/out` and deploy only Hosting using `app/firebase.json`. Unknown URLs return the static 404 page. Hosting includes framing, MIME-sniffing and referrer protections.

`verification/devnet-readback.json` records the SHA-256 comparison between the tested compiled program and the deployed devnet bytes. Browser verification and hosting readback are recorded separately. These checks are not an independent audit or an endorsement for real-money use.

## MSIX / MSAF website and token identities (2026-11-04)

The home now presents MSIX (music-related equity index) and MSAF (private music projects), with a browser-only, one-year USD calculator and `/disclosures/`. The old funding demo moved to `/explore/`; its contract and devnet-only wallet configuration are unchanged.

The calculator deducts entry purchase and network costs, then applies the assumed gross return less management/indexing and rebalancing charges to starting invested capital. Taxes, exit costs and currency effects are excluded. There is no live market feed, approved fee schedule, NAV or investment checkout. `app/tests/returns.test.cjs` verifies costs, weights, losses and invalid inputs.

Source-backed context is deliberately separate from our scenarios: MUSQ ETF one-year NAV return of −9.73% as of July 31, 2026; Round Hill's 2022 report states a 9–11% medium-term net return **target**, not a realized return or a proxy for new artists. MSAF's 8% assumption is not derived from either reference.

### Token workflow

The script uses the installed Solana/SPL CLI and existing issuer wallet. Private mint keypairs are stored outside the repository in `~/.config/music-solana/tokens/<network>/` with restricted permissions. Never copy or publish these keypairs. Registry/key mismatch stops execution.

```sh
# Read-only RPC checks + local metadata/key preparation; sends no transactions.
node scripts/tokens.cjs --network=mainnet-beta

# Create or resume two EMPTY Token-2022 identities on the test network.
node scripts/tokens.cjs --network=devnet --execute

# Only after funding the issuer and publishing matching mainnet metadata:
node scripts/tokens.cjs --network=mainnet-beta --execute
```

These commands do not purchase securities, accept investor deposits, mint token units, transfer investor funds, or create markets. Each identity has six decimals, zero supply, metadata and accounts frozen by default. Mint, freeze and metadata authorities remain with the issuer. The script verifies the network genesis, account owner, supply, decimals, authorities, metadata and default account state by RPC readback. It resumes existing identities instead of generating new addresses.

Mainnet preflight uses a conservative rent allowance for 1,024 bytes per mint, plus 0.001 SOL headroom. The recommended wallet funding is 0.02 SOL; unused SOL remains in the issuer wallet. The actual devnet creation consumed 0.00543512 test SOL for both identities, including metadata. Network rent/fees can change. Do not confuse token identities with an operational backed fund.

Real investments remain unavailable until operating entity/jurisdiction, economic rights, asset provider/custody, artist contracts, valuation, eligibility, subscriptions/redemptions/distributions and independent verification are established. Publishing metadata or funding gas does not resolve these requirements.

### Website release checks

Use Node 24+. After changes or a token registry update:

```sh
cd app
npm test
npm run typecheck
npm run build
python3 -m http.server 4173 --bind 127.0.0.1 --directory out
# In another shell; uses installed Chrome and Playwright:
npm run test:browser
firebase deploy --only hosting --project musicsolana --non-interactive
```

`MUSIC_SOLANA_QA_URL` can select a preview URL. Browser QA verifies Spanish/English persistence, both strategies, negative and invalid scenarios, public token metadata, mobile widths down to 320px, FAQ/navigation and the separate devnet routes. Screenshots and results are written to `verification/`.

After deployment, compare production route and metadata SHA-256 hashes against `app/out`; check 404 behavior and security headers. Keep the existing Firebase project and repository; do not create a replacement hosting project.

### Dated stock-history snapshot

`node scripts/refresh-market.cjs` retrieves adjusted daily closes from Yahoo Finance for SPOT/AAPL/AMZN/GOOGL, checks symbol/currency and common dates, excludes the current UTC day, rejects stale/incomplete data, and writes `app/public/market/msix-history.json`. No trades or account access occur. This is a manual prebuild update, not a scheduled feed.

The initial snapshot spans 2025-11-03 to 2026-11-03 (365 days). The hypothetical 40/20/20/20 basket returned 1.561187% before costs over that period. The calculator starts with the underlying annualized returns, with a visible source and date; users can replace them with scenarios. It does not claim these are tokenized-instrument prices, actual MSIX holdings/NAV or MSIX performance. Adjusted prices already incorporate provider adjustments; dividends must not be added again. Rebuild and redeploy after refreshing.
