// Only the local validator is permitted here. All keys are disposable.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const anchor = require('@coral-xyz/anchor');
const { IDL, PROGRAM_ID } = require('../src/utils/idl.ts');
const { Connection, Keypair, PublicKey, SystemProgram } = anchor.web3;
test('funding, revenue before withdrawal, authorization and repeated claims', async () => {
  const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
  const artist = Keypair.generate(), investor = Keypair.generate(), stranger = Keypair.generate();
  for (const key of [artist, investor, stranger]) {
    const signature = await connection.requestAirdrop(key.publicKey, 2_000_000_000);
    await connection.confirmTransaction(signature, 'confirmed');
  }
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(artist), { commitment: 'confirmed' });
  const program = new anchor.Program(IDL, new PublicKey(PROGRAM_ID), provider);
  const title = 'Regression ' + Date.now();
  const [project] = PublicKey.findProgramAddressSync([Buffer.from('project'), artist.publicKey.toBuffer(), Buffer.from(title)], program.programId);
  const [vault] = PublicKey.findProgramAddressSync([Buffer.from('vault'), project.toBuffer()], program.programId);
  const [investment] = PublicKey.findProgramAddressSync([Buffer.from('investment'), project.toBuffer(), investor.publicKey.toBuffer()], program.programId);
  const base = { project, vault, systemProgram: SystemProgram.programId };
  await program.methods.createProject(title, 'Disposable local integration test', new anchor.BN(10_000_000), new anchor.BN(3), 3000).accounts({ ...base, artist: artist.publicKey }).rpc();
  for (const shares of [1, 2]) await program.methods.invest(new anchor.BN(shares)).accounts({ ...base, investment, investor: investor.publicKey }).signers([investor]).rpc();
  assert.equal((await program.account.project.fetch(project)).amountRaised.toString(), '10000000');
  await assert.rejects(program.methods.invest(new anchor.BN(1)).accounts({ ...base, investment, investor: investor.publicKey }).signers([investor]).rpc());
  await program.methods.distributeRevenue(new anchor.BN(300_000)).accounts({ ...base, artist: artist.publicKey }).rpc();
  await assert.rejects(program.methods.withdrawFunds().accounts({ ...base, artist: stranger.publicKey }).signers([stranger]).rpc());
  const before = await connection.getBalance(vault);
  await program.methods.withdrawFunds().accounts({ ...base, artist: artist.publicKey }).rpc();
  assert.equal(before - await connection.getBalance(vault), 10_000_000, 'Artist must not withdraw investor revenue');
  const investorBefore = await connection.getBalance(investor.publicKey);
  await program.methods.claimRevenue().accounts({ ...base, investment, investor: investor.publicKey }).signers([investor]).rpc();
  assert.equal(await connection.getBalance(investor.publicKey) - investorBefore, 300_000);
  assert.equal((await program.account.investment.fetch(investment)).revenueClaimed.toString(), '300000');
  await assert.rejects(program.methods.claimRevenue().accounts({ ...base, investment, investor: investor.publicKey }).signers([investor]).rpc());
});
