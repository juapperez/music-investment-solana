# Music investment on Solana (hackathon project)

Artists raise money by selling shares in a music project; investors receive a proportional share of the revenue the artist deposits. Everything runs on Solana **devnet**.

- **On-chain program** (`music-investment/programs/music_investment`): Anchor 0.30. Project, Vault and Investment PDAs; instructions to create a project, buy shares, withdraw raised funds, distribute revenue and claim it.
- **Web app** (`music-investment/app`): Next.js 14, wallet adapter, Spanish/English.
- **Live demo**: https://musicsolana.web.app (devnet, test SOL only).

Built for the Solana LATAM Hackathon. Full architecture, account layout and instruction reference: [`music-investment/README.md`](music-investment/README.md).

Not audited. Not for real funds.
