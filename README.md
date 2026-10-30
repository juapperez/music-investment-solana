# Music Solana

A music-project funding preview on **Solana devnet**, using test SOL with no monetary value. The web app is at https://musicsolana.web.app.

Artists create projects; supporters purchase project shares recorded in program-derived accounts. Once fully funded, the artist can withdraw the funding principal. Revenue deposited separately by the artist remains available for proportional claims by supporters.

These shares are not SPL tokens, transferable assets or legal ownership of music rights. The app does not collect streaming royalties, verify revenue, promise returns or support mainnet.

- Program: Anchor 0.32.1; `music-investment/programs/music_investment`.
- Web: Next.js 15, React 19, wallet adapter; `music-investment/app`.
- Default language: English; Spanish is available.
- Devnet program: `7gyrL4T4kUXQwpGuU95QnwUsdVJ1Z5AhGeXrHY63PiwK`.

See [development and verification](music-investment/README.md). This implementation has regression tests and release checks; it has not received an independent smart-contract audit and is not ready for real funds.
