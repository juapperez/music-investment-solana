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
