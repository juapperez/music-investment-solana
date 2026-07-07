const { AnchorProvider, Program, BN, Wallet } = require("@coral-xyz/anchor");
const { Connection, Keypair, PublicKey, SystemProgram } = require("@solana/web3.js");
const fs = require("fs");

// Minimal IDL needed to create projects and invest in them
const IDL = {
  version: "0.1.0",
  name: "music_investment",
  instructions: [
    {
      name: "createProject",
      accounts: [
        { name: "project", isMut: true, isSigner: false },
        { name: "vault", isMut: true, isSigner: false },
        { name: "artist", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "title", type: "string" },
        { name: "description", type: "string" },
        { name: "fundingGoal", type: "u64" },
        { name: "totalShares", type: "u64" },
        { name: "revenueShareBps", type: "u16" },
      ],
    },
    {
      name: "invest",
      accounts: [
        { name: "project", isMut: true, isSigner: false },
        { name: "vault", isMut: true, isSigner: false },
        { name: "investment", isMut: true, isSigner: false },
        { name: "investor", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [{ name: "sharesToBuy", type: "u64" }],
    },
  ],
};

const PROGRAM_ID = new PublicKey("7gyrL4T4kUXQwpGuU95QnwUsdVJ1Z5AhGeXrHY63PiwK");

function getProjectPDA(artistPubkey, title) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("project"), artistPubkey.toBuffer(), Buffer.from(title)],
    PROGRAM_ID
  );
}

function getVaultPDA(projectPubkey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), projectPubkey.toBuffer()],
    PROGRAM_ID
  );
}

function getInvestmentPDA(projectPubkey, investorPubkey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("investment"), projectPubkey.toBuffer(), investorPubkey.toBuffer()],
    PROGRAM_ID
  );
}

// Sample projects. `buyShares` seeds an initial investment so the demo
// marketplace shows real funding progress instead of empty 0% bars.
const projects = [
  {
    title: "Neon Dreams EP",
    desc: "An upcoming synthwave EP exploring cybernetic themes and neon cityscapes.",
    goal: 2, // SOL
    shares: 1000,
    revShare: 2000, // 20%
    buyShares: 300, // -> 30% funded (Active)
  },
  {
    title: "Echoes of the Void",
    desc: "A sprawling ambient techno album designed for deep space exploration.",
    goal: 0.5, // SOL
    shares: 500,
    revShare: 1500, // 15%
    buyShares: 500, // -> 100% funded (Funded)
  },
  {
    title: "Midnight Frequencies",
    desc: "A lo-fi hip-hop tape recorded on analog gear for late-night listening.",
    goal: 1, // SOL
    shares: 800,
    revShare: 2500, // 25%
    buyShares: 200, // -> 25% funded (Active)
  },
];

async function main() {
  const secret = JSON.parse(
    fs.readFileSync(process.env.HOME + "/.config/solana/id.json", "utf-8")
  );
  const keypair = Keypair.fromSecretKey(new Uint8Array(secret));
  const wallet = new Wallet(keypair);

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const program = new Program(IDL, PROGRAM_ID, provider);

  console.log(`Seeding with wallet: ${keypair.publicKey.toString()}\n`);

  for (const proj of projects) {
    const [projectPDA] = getProjectPDA(keypair.publicKey, proj.title);
    const [vaultPDA] = getVaultPDA(projectPDA);

    const goalLamports = new BN(proj.goal * 1e9);
    const shares = new BN(proj.shares);

    console.log(`Creating project: ${proj.title}...`);
    try {
      const tx = await program.methods
        .createProject(proj.title, proj.desc, goalLamports, shares, proj.revShare)
        .accounts({
          project: projectPDA,
          vault: vaultPDA,
          artist: keypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log(`  created. TX: ${tx}`);
    } catch (e) {
      if (e.message && e.message.includes("custom program error: 0x0")) {
        console.log(`  already exists, skipping creation.`);
      } else {
        console.error("  create error:", e.message || e);
        continue;
      }
    }

    if (proj.buyShares) {
      const [investmentPDA] = getInvestmentPDA(projectPDA, keypair.publicKey);
      console.log(`  investing in ${proj.buyShares}/${proj.shares} shares...`);
      try {
        const tx = await program.methods
          .invest(new BN(proj.buyShares))
          .accounts({
            project: projectPDA,
            vault: vaultPDA,
            investment: investmentPDA,
            investor: keypair.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        console.log(`  invested. TX: ${tx}`);
      } catch (e) {
        console.log(`  invest skipped: ${e.message || e}`);
      }
    }
    console.log("");
  }

  console.log("Done. Open the frontend to see the seeded projects.");
}

main().catch(console.error);
