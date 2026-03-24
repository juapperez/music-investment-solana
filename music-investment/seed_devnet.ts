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

async function main() {
  const secret = JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json", "utf-8"));
  const keypair = Keypair.fromSecretKey(new Uint8Array(secret));
  const wallet = new Wallet(keypair);

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  
  const program = new Program(IDL as any, PROGRAM_ID, provider);

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
    } catch (e: any) {
      if (e.message && e.message.includes("custom program error: 0x0")) {
        console.log(`Project ${proj.title} might already exist!`);
      } else {
        console.error("Error:", e);
      }
    }
  }
}

main().catch(console.error);
