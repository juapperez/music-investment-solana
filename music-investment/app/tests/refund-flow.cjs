// Loaded only by scripts/test-refunds-local.cjs. All balances and keys are disposable.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const anchor = require("@coral-xyz/anchor");
const { IDL, PROGRAM_ID } = require("../src/utils/idl.ts");
const { Connection, Keypair, PublicKey, SystemProgram } = anchor.web3;
const connection = new Connection("http://127.0.0.1:8899", "confirmed");
const fixturePath = process.env.MUSIC_SOLANA_REFUND_FIXTURE;
if (!fixturePath)
  throw new Error(
    "Use node scripts/test-refunds-local.cjs to create isolated fixtures",
  );
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const artist = Keypair.fromSecretKey(Uint8Array.from(fixture.artist));
const investor = Keypair.fromSecretKey(Uint8Array.from(fixture.investor));
const second = Keypair.fromSecretKey(Uint8Array.from(fixture.second));
const stranger = Keypair.fromSecretKey(Uint8Array.from(fixture.stranger));
const provider = new anchor.AnchorProvider(
  connection,
  new anchor.Wallet(artist),
  { commitment: "confirmed" },
);
const program = new anchor.Program(IDL, new PublicKey(PROGRAM_ID), provider);

function accounts(title, who = investor) {
  const [project] = PublicKey.findProgramAddressSync(
    [Buffer.from("project"), artist.publicKey.toBuffer(), Buffer.from(title)],
    program.programId,
  );
  const [vault] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), project.toBuffer()],
    program.programId,
  );
  const [investment] = PublicKey.findProgramAddressSync(
    [Buffer.from("investment"), project.toBuffer(), who.publicKey.toBuffer()],
    program.programId,
  );
  return {
    project,
    vault,
    investment,
    investor: who.publicKey,
    systemProgram: SystemProgram.programId,
  };
}
const buy = (a, who, shares) =>
  program.methods
    .invest(new anchor.BN(shares))
    .accounts(a)
    .signers([who])
    .rpc();
const refund = (a, who) =>
  program.methods.refundInvestment().accounts(a).signers([who]).rpc();
async function create(title, goal = 10000001, shares = 3) {
  const a = accounts(title);
  await program.methods
    .createProject(
      title,
      "Disposable refund regression",
      new anchor.BN(goal),
      new anchor.BN(shares),
      3000,
    )
    .accounts({ ...a, artist: artist.publicKey })
    .rpc();
  return a;
}

test("artist cancellation refunds exact individual contributions and rent, without repeat claims", async () => {
  const title = "Cancel " + Date.now();
  const a = await create(title);
  const b = accounts(title, second);
  const originalVault = await connection.getBalance(a.vault);
  await buy(a, investor, 1);
  await buy(b, second, 1);
  await assert.rejects(refund(a, investor), /RefundNotAvailable|6014|0x177e/);
  await assert.rejects(
    program.methods
      .cancelProject()
      .accounts({ project: a.project, artist: stranger.publicKey })
      .signers([stranger])
      .rpc(),
  );
  const sizeBefore = (await connection.getAccountInfo(a.project)).data.length;
  await program.methods
    .cancelProject()
    .accounts({ project: a.project, artist: artist.publicKey })
    .rpc();
  await assert.rejects(buy(a, investor, 1));
  await assert.rejects(
    program.methods
      .withdrawFunds()
      .accounts({ ...a, artist: artist.publicKey })
      .rpc(),
  );
  await assert.rejects(
    refund({ ...a, investor: stranger.publicKey }, stranger),
  );

  for (const [position, who, expectedAmount] of [
    [a, investor, 3333333],
    [b, second, 3333334],
  ]) {
    const contribution = await program.account.investment.fetch(
      position.investment,
    );
    assert.equal(contribution.amountInvested.toNumber(), expectedAmount);
    const accountRent = await connection.getBalance(position.investment);
    const before = await connection.getBalance(who.publicKey);
    await refund(position, who);
    assert.equal(
      (await connection.getBalance(who.publicKey)) - before,
      expectedAmount + accountRent,
    );
    assert.equal(await connection.getAccountInfo(position.investment), null);
    await assert.rejects(refund(position, who));
  }
  const project = await program.account.project.fetch(a.project);
  assert.deepEqual(project.status, { cancelled: {} });
  assert.equal(project.amountRaised.toString(), "0");
  assert.equal(project.sharesSold.toString(), "0");
  assert.equal(
    (await connection.getAccountInfo(a.project)).data.length,
    sizeBefore,
  );
  assert.equal(
    await connection.getBalance(a.vault),
    originalVault,
    "Project vault rent stays intact",
  );
});

test("expired pre-existing account layout supports refunds without the artist and rejects further funding", async () => {
  const a = accounts(fixture.expiredTitle);
  const b = accounts(fixture.expiredTitle, second);
  const beforeProject = await program.account.project.fetch(a.project);
  assert.equal(beforeProject.createdAt.toString(), "1");
  assert.deepEqual(beforeProject.status, { active: {} });
  await assert.rejects(buy(a, investor, 1), /FundingExpired|6013|0x177d/);
  // The stranger pays fees so the artist signs neither refund nor its transaction.
  const refundProvider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(stranger),
    { commitment: "confirmed" },
  );
  const refundProgram = new anchor.Program(
    IDL,
    program.programId,
    refundProvider,
  );
  for (const [position, who] of [
    [a, investor],
    [b, second],
  ]) {
    const original = await program.account.investment.fetch(
      position.investment,
    );
    const before = await connection.getBalance(who.publicKey);
    const rent = await connection.getBalance(position.investment);
    await refundProgram.methods
      .refundInvestment()
      .accounts(position)
      .signers([who])
      .rpc();
    assert.equal(
      (await connection.getBalance(who.publicKey)) - before,
      original.amountInvested.toNumber() + rent,
    );
  }
  const after = await program.account.project.fetch(a.project);
  assert.deepEqual(after.status, { cancelled: {} });
  assert.equal(after.amountRaised.toString(), "0");
  assert.equal(after.sharesSold.toString(), "0");
  assert.equal(
    await connection.getBalance(a.vault),
    fixture.expiredVaultReserve,
  );
});

test("funded and released projects cannot be cancelled or refunded", async () => {
  const a = await create("Funded " + Date.now());
  await buy(a, investor, 3);
  await assert.rejects(
    program.methods
      .cancelProject()
      .accounts({ project: a.project, artist: artist.publicKey })
      .rpc(),
  );
  await assert.rejects(refund(a, investor), /RefundNotAvailable|6014|0x177e/);
  await program.methods
    .withdrawFunds()
    .accounts({ ...a, artist: artist.publicKey })
    .rpc();
  await assert.rejects(refund(a, investor), /RefundNotAvailable|6014|0x177e/);
  await assert.rejects(
    program.methods
      .cancelProject()
      .accounts({ project: a.project, artist: artist.publicKey })
      .rpc(),
  );
});

test("a contribution from another project cannot be refunded against the wrong vault", async () => {
  const a = await create("First " + Date.now());
  const b = await create("Second " + Date.now());
  await buy(a, investor, 1);
  await buy(b, investor, 1);
  for (const x of [a, b])
    await program.methods
      .cancelProject()
      .accounts({ project: x.project, artist: artist.publicKey })
      .rpc();
  const beforeA = await connection.getBalance(a.vault);
  const beforeB = await connection.getBalance(b.vault);
  await assert.rejects(refund({ ...a, investment: b.investment }, investor));
  await assert.rejects(refund({ ...a, vault: b.vault }, investor));
  assert.equal(await connection.getBalance(a.vault), beforeA);
  assert.equal(await connection.getBalance(b.vault), beforeB);
});
