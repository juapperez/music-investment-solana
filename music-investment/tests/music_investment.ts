import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";

describe("music_investment", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MusicInvestment as Program<any>;
  const artist = provider.wallet;

  const investor = anchor.web3.Keypair.generate();
  const PROJECT_TITLE = "My Test Album";

  let projectPDA: PublicKey;
  let vaultPDA: PublicKey;
  let investmentPDA: PublicKey;

  before(async () => {
    // Airdrop to investor
    const sig = await provider.connection.requestAirdrop(
      investor.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    [projectPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("project"), artist.publicKey.toBuffer(), Buffer.from(PROJECT_TITLE)],
      program.programId
    );
    [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), projectPDA.toBuffer()],
      program.programId
    );
    [investmentPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("investment"), projectPDA.toBuffer(), investor.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Creates a music project", async () => {
    await program.methods
      .createProject(
        PROJECT_TITLE,
        "A test album for the hackathon",
        new BN(1 * LAMPORTS_PER_SOL), // 1 SOL goal
        new BN(100),                   // 100 shares
        3000                           // 30% revenue share
      )
      .accounts({
        project: projectPDA,
        vault: vaultPDA,
        artist: artist.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const project = await program.account.project.fetch(projectPDA);
    assert.equal(project.title, PROJECT_TITLE);
    assert.equal(project.totalShares.toNumber(), 100);
    assert.equal(project.revenueShareBps, 3000);
    assert.deepEqual(project.status, { active: {} });
  });

  it("Investor buys shares", async () => {
    await program.methods
      .invest(new BN(10)) // buy 10 shares
      .accounts({
        project: projectPDA,
        vault: vaultPDA,
        investment: investmentPDA,
        investor: investor.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([investor])
      .rpc();

    const project = await program.account.project.fetch(projectPDA);
    assert.equal(project.sharesSold.toNumber(), 10);

    const investment = await program.account.investment.fetch(investmentPDA);
    assert.equal(investment.shares.toNumber(), 10);
    assert.equal(investment.investor.toString(), investor.publicKey.toString());
  });

  it("Artist distributes revenue", async () => {
    // First fully fund the project by buying remaining shares
    // (simplified: just distribute revenue directly for test)
    const revenueAmount = new BN(0.1 * LAMPORTS_PER_SOL);

    await program.methods
      .distributeRevenue(revenueAmount)
      .accounts({
        project: projectPDA,
        vault: vaultPDA,
        artist: artist.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const project = await program.account.project.fetch(projectPDA);
    assert.equal(
      project.totalRevenueDistributed.toNumber(),
      revenueAmount.toNumber()
    );
  });

  it("Investor claims revenue", async () => {
    const investorBefore = await provider.connection.getBalance(investor.publicKey);

    await program.methods
      .claimRevenue()
      .accounts({
        project: projectPDA,
        vault: vaultPDA,
        investment: investmentPDA,
        investor: investor.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([investor])
      .rpc();

    const investorAfter = await provider.connection.getBalance(investor.publicKey);
    assert.isAbove(investorAfter, investorBefore, "Investor should have received revenue");

    const investment = await program.account.investment.fetch(investmentPDA);
    assert.isAbove(investment.revenueClaimed.toNumber(), 0);
  });
});
