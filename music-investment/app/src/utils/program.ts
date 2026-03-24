import { AnchorProvider, Program, BN, web3 } from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import { IDL, PROGRAM_ID } from "./idl";

export const DEVNET_RPC = "https://api.devnet.solana.com";

export function getProgram(provider: AnchorProvider) {
  return new Program(IDL as any, new PublicKey(PROGRAM_ID), provider);
}

export function getProjectPDA(artistPubkey: PublicKey, title: string) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("project"), artistPubkey.toBuffer(), Buffer.from(title)],
    new PublicKey(PROGRAM_ID)
  );
}

export function getVaultPDA(projectPubkey: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), projectPubkey.toBuffer()],
    new PublicKey(PROGRAM_ID)
  );
}

export function getInvestmentPDA(projectPubkey: PublicKey, investorPubkey: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("investment"), projectPubkey.toBuffer(), investorPubkey.toBuffer()],
    new PublicKey(PROGRAM_ID)
  );
}

export function solToLamports(sol: number): BN {
  return new BN(sol * web3.LAMPORTS_PER_SOL);
}

export function lamportsToSol(lamports: BN | number): number {
  const val = typeof lamports === "number" ? lamports : lamports.toNumber();
  return val / web3.LAMPORTS_PER_SOL;
}

export function statusLabel(status: any): string {
  if (status?.active !== undefined) return "Active";
  if (status?.funded !== undefined) return "Funded";
  if (status?.released !== undefined) return "Released";
  if (status?.cancelled !== undefined) return "Cancelled";
  return "Unknown";
}

export async function fetchAllProjects(connection: Connection) {
  const programId = new PublicKey(PROGRAM_ID);
  // Fetch all accounts owned by the program with Project discriminator
  const accounts = await connection.getProgramAccounts(programId, {
    filters: [{ dataSize: 8 + 32 + (4 + 64) + (4 + 256) + 8 + 8 + 8 + 8 + 2 + 1 + 8 + 8 + 1 }],
  });
  return accounts;
}
