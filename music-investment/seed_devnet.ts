import { AnchorProvider, Program, BN, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import fs from "fs";
import { IDL } from "./app/src/utils/idl";

const PROGRAM_ID = new PublicKey("7gyrL4T4kUXQwpGuU95QnwUsdVJ1Z5AhGeXrHY63PiwK");

function getProjectPDA(artistPubkey: PublicKey, title: string) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("project"), artistPubkey.toBuffer(), Buffer.from(title)],
    PROGRAM_ID
  );
}

function getVaultPDA(projectPubkey: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), projectPubkey.toBuffer()],
    PROGRAM_ID
  );
}

function getInvestmentPDA(projectPubkey: PublicKey, investorPubkey: PublicKey) {
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
  const program = new Program(IDL as any, PROGRAM_ID, provider);

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
    } catch (e: any) {
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
      } catch (e: any) {
        console.log(`  invest skipped: ${e.message || e}`);
      }
    }
    console.log("");
  }

  console.log("Done. Open the frontend to see the seeded projects.");
}

main().catch(console.error);
