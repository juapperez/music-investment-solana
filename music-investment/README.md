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

### Cancellation and refund preview — tested locally, not deployed

The next program version adds two instructions using the existing account layout and `Cancelled` status:

- `cancel_project`: only the artist may cancel an `Active` campaign. Funded and released projects cannot be cancelled.
- `refund_investment`: each contributor may reclaim their exact recorded contribution after cancellation, or once an incomplete campaign reaches 30 days from `created_at`. It requires the contributor's signature and their investment PDA. Success closes that investment account back to its owner, returning the account rent and preventing a repeated refund; transaction fees still apply.

At the deadline, new investments are rejected even before anyone requests a refund. The first refund after expiry marks the campaign cancelled. Remaining contributors can claim separately. No automatic payment, artist signature, token issuance or royalty collection is involved. Refunds never reopen the campaign; this preserves the cumulative purchase-pricing rules. Vault rent stays in place and unrelated investor accounts are untouched.

The 30-day limit uses the original creation timestamp, including existing `Active` accounts if the program is upgraded. There is no account migration, but this is a behavior change for those campaigns. A funded project remains funded after the deadline and cannot use the refund path.

Run the isolated preview with Node 24+, Anchor 0.32.1 and the existing Solana tools:

```sh
cargo test --lib
anchor build --no-idl
cd app
npm run test:refunds
npm run typecheck
```

The refund runner refuses occupied RPC/faucet ports, creates its own local validator, generates disposable keys and preloads an expired account fixture without contract test hooks. It runs the existing revenue flow plus four refund scenarios, stops only its own validator, removes successful temporary fixtures and writes `verification/refunds-local.json` with the tested binary hash. It never clones remote accounts, deploys to a public network, reads the user's wallet, or spends public-network SOL.

The matching UI is enabled only when `NODE_ENV=development` and `NEXT_PUBLIC_REFUND_PREVIEW=local`. Its RPC is fixed to `http://127.0.0.1:8899`; production builds always use the existing devnet connection and never expose the undeployed instructions. The preview reads Solana's Clock account for the deadline, asks the artist to confirm cancellation, shows each contributor's refundable principal, and displays a receipt only after transaction confirmation. A missing clock disables deadline-dependent actions; cancelled-campaign refunds do not depend on a clock lookup. Wallet rejection leaves the action available for retry. Refunded positions close on-chain and disappear from the portfolio.

Run its browser integration separately (Node 24+ and installed Chrome; fully headless):

```sh
cd app
node --experimental-strip-types --test tests/refunds.test.cjs
# Deliberately supply the local flag to challenge the production gate.
NEXT_PUBLIC_REFUND_PREVIEW=local npm run build
npm run test:refund-ui
```

This runner owns the local validator, preview server on port 4174 and static production preview on 4173. The browser uses disposable Phantom test identities, with private keys confined to the Node test process. It covers artist/contributor/stranger/disconnected roles, rejected signatures, confirmed cancellation, exact refund plus account rent minus actual fee, portfolio removal, expiry, funded/released rejection, English/Spanish, narrow screens, and the production gate. Production read RPC calls are redirected to local fixtures and transaction submission is prohibited. External font CSS is stubbed so no external browser traffic is needed. Evidence is in `verification/refunds-ui.json`, `verification/refunds-ui-runtime.json` and two screenshots. This does not test an actual Phantom extension or a public deployment.

**Release state:** the published web and public devnet program remain on the earlier version. The client IDL includes the new instructions for local tests; there are no refund/cancellation controls enabled on the published site. The newly compiled artifact is a local preview and must not be mistaken for the binary in the older `devnet-readback.json`. A future authorized program upgrade, deployed-byte readback, public-network validation and explicit removal of the local-only UI gate are needed before exposing this behavior publicly. These legacy project records are separate from MSIX/MSAF and establish no music rights or fund backing.

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

Mainnet preflight calculates the actual serialized mint sizes (397 and 403 bytes) and requests current rent for each, plus 0.0005 SOL for transaction fees and headroom. The recommended wallet funding is rounded up to 0.01 SOL; unused SOL remains in the issuer wallet. The actual devnet creation consumed 0.00543512 test SOL for both identities, including metadata. Network rent/fees can change. Do not confuse token identities with an operational backed fund.

Resuming a partial deployment budgets only unfinished work: an existing mint with missing metadata needs the remaining rent top-up, and a completed mint needs no new transaction. Existing execution receipts are retained across retries. Both mint states and both published metadata documents are checked before the first mainnet transaction; JSON key ordering does not change metadata identity. Reports distinguish the observed wallet balance decrease from actual transaction fees, because unrelated wallet activity can affect that balance. `app/tests/token-deployment.test.cjs` exercises the real script with an in-memory filesystem, RPC and CLI; it cannot read wallet keys or send transactions.

The operating entity/jurisdiction are confirmed: PDEVELOP LLC, New Mexico, United States. Real investment flows still require specific economic rights, an eligible asset provider/custody, artist contracts, valuation, eligibility and subscriptions/redemptions/distributions. Publishing metadata or funding gas does not resolve these requirements.

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


## Confirmed operator (2026-11-04)

PDEVELOP LLC is the project operator. Its Certificate of Organization and Articles of Organization establish New Mexico, United States, formation on 2026-08-21, entity 0008124865. Public business facts and document SHA-256 digests are in `app/public/legal/operator.json`. The underlying PDFs, tax IDs, passports and personal documents are not copied into the repository or the website. Corporate identity is now shown on the site, structured metadata and both token metadata documents.

xStocks' published terms §1.3 limit delivery to non-US persons. Dinari's current FAQ states dShares are offered outside the US and lists Solana as planned, so neither is treated as an enabled provider for this US LLC. Alpaca ITN's AP guide requires onboarding with an issuer and linkage of the brokerage account; an ordinary company formation document is not evidence of that onboarding. No such project-specific credentials or artist agreements were found in the relevant local sources reviewed. Do not substitute Naeku/client royalty reports or the unrelated jewelry management agreement for Music Solana fund rights.

Preflight reports now use `verification/tokens-<network>-preflight.json`; original execution records are retained separately. After metadata changes, run both network preflights to regenerate public metadata, build, test and deploy. Mainnet execution requires the matching metadata to be publicly available before sending transactions.

## Preparing provider and artist agreements

The `operations/` files prepare the missing commercial terms and evidence without asserting that contracts exist:

- `artist-project-agreement.template.json`: parties, authority, recordings and compositions, chain of title, assigned economic rights, budget, recoupment, cash distributions, reporting, exit terms and execution evidence. Financial terms remain blank. The website's illustrative 8% is not an agreed return.
- `equity-provider-custody.template.json`: confirmed PDEVELOP LLC facts, the proposed basket, written US-entity eligibility, Solana instruments, custody, fees, statements, NAV and account acceptance. No provider is marked enabled.
- `evidence-register.template.json`: document references, hashes, signatures, dates, human review and the exact claim supported. Drafts and unverified files do not establish rights. A hash proves file identity, not ownership or signature validity.

Complete private copies outside this repository and `app/public`; keep contracts, identity documents, account identifiers and financial statements private. The templates are not executed contracts or an offering and do not turn on investments. Corporate formation evidence cannot substitute for provider acceptance or artist rights. Recording and composition rights are tracked separately, following the [US Copyright Office distinction](https://www.copyright.gov/circs/circ56a.pdf).

All continuation work must be headless: CLI, APIs, local files or a genuinely headless browser. Do not open or focus the user's browser or native apps. Creation of token identities and any actual financial operations remain separate from preparing these materials.
