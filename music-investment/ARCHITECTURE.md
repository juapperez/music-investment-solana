# Architecture

This document describes the on-chain program and the data model that powers
Musicsolana. For a high-level overview and diagrams, see the
[README](./README.md).

---

## Overview

Musicsolana is a single Anchor program (`music_investment`) deployed to Solana
devnet, plus a Next.js frontend that talks to it through
`@solana/wallet-adapter` and `@coral-xyz/anchor`.

The program lets an **artist** raise SOL by selling a fixed number of shares in
a music project. **Investors** buy shares; their SOL is escrowed in a
program-owned vault. Once the goal is met the artist withdraws the raised SOL,
and as the music generates income the artist distributes revenue back to the
vault, where investors claim their proportional share.

There is no admin key and no platform fee — every account is a Program Derived
Address (PDA) owned by the program, and all funds flow through PDAs the program
controls.

---

## Accounts

### Project (PDA)

Holds the state of a single fundraising project.

| Field | Type | Purpose |
|---|---|---|
| `artist` | `Pubkey` | Owner who created the project |
| `title` | `String` (≤64) | Display title; also part of the PDA seed |
| `description` | `String` (≤256) | Free-form description |
| `funding_goal` | `u64` | Target raise, in lamports |
| `total_shares` | `u64` | Total shares offered |
| `shares_sold` | `u64` | Shares sold so far |
| `amount_raised` | `u64` | Lamports raised so far |
| `revenue_share_bps` | `u16` | Revenue share offered to investors, in basis points (0–10000) |
| `status` | `ProjectStatus` | `Active` → `Funded` → `Released` (or `Cancelled`) |
| `total_revenue_distributed` | `u64` | Cumulative revenue paid into the vault |
| `created_at` | `i64` | Unix timestamp of creation |
| `bump` | `u8` | Project PDA bump |
| `vault_bump` | `u8` | Vault PDA bump |

**Seeds:** `[b"project", artist, title]`

### Vault (PDA)

A minimal, program-owned SOL account. It has no data of its own (allocated with
8 bytes so it is rent-exempt) and simply escrows lamports for one project.
Investments flow in, and withdrawals / revenue claims flow out. Only the program
can move lamports out of it.

**Seeds:** `[b"vault", project]`

### Investment (PDA)

One per (project, investor) pair, created the first time an investor buys shares.

| Field | Type | Purpose |
|---|---|---|
| `investor` | `Pubkey` | The investor |
| `project` | `Pubkey` | The project invested in |
| `shares` | `u64` | Shares owned |
| `amount_invested` | `u64` | Lamports invested |
| `revenue_claimed` | `u64` | Lamports of revenue already claimed |
| `bump` | `u8` | Investment PDA bump |

**Seeds:** `[b"investment", project, investor]`

Because the address is derived from both the project and the investor, repeated
purchases accumulate into the same account (`init_if_needed`), and
`revenue_claimed` tracks how much the investor has already withdrawn so double
claims are impossible.

---

## Instructions

| Instruction | Caller | Effect |
|---|---|---|
| `create_project` | Artist | Initializes the Project and Vault PDAs and validates inputs |
| `invest` | Investor | Transfers `shares × price` lamports to the vault, mints/updates the Investment PDA, flips the project to `Funded` when sold out |
| `withdraw_funds` | Artist | Moves raised SOL (above rent-exempt minimum) from the vault to the artist; flips status to `Released` |
| `distribute_revenue` | Artist | Transfers `amount` lamports from the artist into the vault and increments `total_revenue_distributed` |
| `claim_revenue` | Investor | Pays out the investor's unclaimed proportional share from the vault |

### Price per share

`invest` derives the per-share price deterministically from the project:

```
price_per_share  = funding_goal / total_shares
investment_amount = price_per_share × shares_to_buy
```

All arithmetic uses checked math (`checked_add`, `checked_mul`, `checked_div`)
so overflow reverts rather than wrapping.

---

## State machine

```
                 invest (sold out)        withdraw_funds
   ┌────────┐   ─────────────────────►  ┌────────┐  ─────────────►  ┌──────────┐
   │ Active │                           │ Funded │                  │ Released │
   └────────┘                           └────────┘                  └──────────┘
        │                                    │                            │
        └──────────── distribute_revenue ────┴──────────── distribute_revenue
                     (allowed once Funded)                (allowed once Released)
```

- **Active** — accepting investments. `invest` is only permitted here.
- **Funded** — every share is sold. The artist may `withdraw_funds` and may
  begin distributing revenue.
- **Released** — the artist has withdrawn the raised principal. Revenue
  distribution and claims continue indefinitely.
- **Cancelled** — reserved for a future cancellation flow.

---

## Revenue accounting

Revenue is split strictly by ownership. When an investor claims, the program
recomputes their entitlement from scratch and subtracts what they have already
taken, so there is no per-distribution bookkeeping to keep in sync:

```
investor_share_bps = shares × 10000 / total_shares
total_claimable    = total_revenue_distributed × investor_share_bps / 10000
claimable          = total_claimable − revenue_claimed
```

The frontend (`app/src/app/project/page.tsx` and `portfolio/page.tsx`) mirrors
this exact formula to show a live "claimable" figure before the user submits a
transaction.

---

## Security properties

- **PDA-only custody** — the vault is a PDA; lamports can only leave it through
  `withdraw_funds` and `claim_revenue`, both of which enforce the caller's
  identity.
- **Access control** — `withdraw_funds` and `distribute_revenue` require
  `project.artist == artist.key()`; `claim_revenue` requires
  `investment.investor == investor.key()`.
- **Overflow safety** — every mutation of a balance or counter uses checked
  arithmetic and returns `MathOverflow` on failure.
- **Rent preservation** — `withdraw_funds` leaves the vault's rent-exempt
  minimum in place so the account is never garbage-collected mid-life.
- **Double-claim prevention** — `revenue_claimed` monotonically tracks paid-out
  revenue; a second claim with nothing new available reverts.
- **Deterministic addresses** — every account is a PDA, so there are no
  free-floating keypairs to leak or lose.

---

## Frontend integration

The client never hand-rolls account layouts. It:

1. Derives PDAs with the helpers in `app/src/utils/program.ts`
   (`getProjectPDA`, `getVaultPDA`, `getInvestmentPDA`).
2. Reads state through Anchor's generated account clients
   (`program.account.project.all()`, `.fetch()`).
3. Submits instructions through `program.methods.*` with the wallet adapter
   provider.

`app/src/utils/idl.ts` holds a hand-maintained copy of the program IDL and the
deployed `PROGRAM_ID`. After any change to the on-chain program, regenerate the
IDL with `anchor build` and copy `target/idl/music_investment.json` into
`idl.ts`, keeping the account field order identical to the Rust struct.
