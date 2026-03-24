const { AnchorProvider, Program, BN, Wallet } = require("@coral-xyz/anchor");
const { Connection, Keypair, PublicKey, SystemProgram } = require("@solana/web3.js");
const fs = require("fs");

// Minimal IDL needed for createProject
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
    }
  ]
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

async function main() {
  const secret = JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json", "utf-8"));
  const keypair = Keypair.fromSecretKey(new Uint8Array(secret));
  const wallet = new Wallet(keypair);

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  
  const program = new Program(IDL, PROGRAM_ID, provider);

  const projects = [
    {
      title: "Neon Dreams EP",
      desc: "An upcoming synthwave EP exploring cybernetic themes and neon cityscapes.",
      goal: 2, // 2 SOL
      shares: 1000,
      revShare: 2000 // 20%
    },
    {
      title: "Echoes of the Void",
      desc: "A sprawling ambient techno album designed for deep space exploration.",
      goal: 1.5, // 1.5 SOL
      shares: 500,
      revShare: 1500 // 15%
    }
  ];

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
      console.log(`Success! TX: ${tx}`);
    } catch (e) {
      if (e.message && e.message.includes("custom program error: 0x0")) {
        console.log(`Project ${proj.title} might already exist!`);
      } else {
        console.error("Error:", e);
      }
    }
  }
}

main().catch(console.error);
