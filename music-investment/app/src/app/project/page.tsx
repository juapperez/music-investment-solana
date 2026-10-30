"use client";
import { claimableRevenue, formatSol, integer, investmentCost, parseShares, parseSol } from "@/utils/amounts";
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { IDL, PROGRAM_ID } from "@/utils/idl";
import { getVaultPDA, getInvestmentPDA, statusLabel } from "@/utils/program";
import toast from "react-hot-toast";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";

function ProjectDetailContent() {
  const searchParams = useSearchParams();
  const pubkey = searchParams.get('id') || '';
  const { connection } = useConnection();
  const wallet = useWallet();
  const { t } = useLanguage();

  const requestSequence = useRef(0);
  const [project, setProject] = useState<any>(null);
  const [investment, setInvestment] = useState<any>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sharesToBuy, setSharesToBuy] = useState("");
  const [revenueAmount, setRevenueAmount] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    requestSequence.current += 1;
    setInvestment(null); setProject(null); setLoadError("");
    if (pubkey) loadProject();
    else { setProject(null); setLoading(false); }
  }, [pubkey, wallet.publicKey]);

  async function loadProject() {
    const request = ++requestSequence.current;
    try {
      setLoading(true); setLoadError("");
      let projectPubkey: PublicKey;
      try { projectPubkey = new PublicKey(pubkey); } catch { setProject(null); return; }
      const provider = new AnchorProvider(connection, {} as any, {});
      const program = new Program(IDL as any, new PublicKey(PROGRAM_ID), provider);
      const acc = await (program.account as any).project.fetchNullable(projectPubkey);
      if (!acc) { if (request === requestSequence.current) setProject(null); return; }
      if (request !== requestSequence.current) return;
      setProject({ publicKey: projectPubkey, account: acc });

      if (wallet.publicKey) {
        const [investmentPDA] = getInvestmentPDA(projectPubkey, wallet.publicKey);
        const invAcc = await (program.account as any).investment.fetchNullable(investmentPDA);
        if (request === requestSequence.current) setInvestment(invAcc ? { publicKey: investmentPDA, account: invAcc } : null);
      }
    } catch (err) {
      console.error(err);
      if (request === requestSequence.current) { setProject(null); setLoadError(t.project.errors.loadFailed); }
    } finally {
      if (request === requestSequence.current) setLoading(false);
    }
  }

  async function handleInvest() {
    if (!wallet.publicKey || !wallet.signTransaction) {
      toast.error(t.project.errors.connectWallet);
      return;
    }
    let shares: bigint;
    try {
      shares = parseShares(sharesToBuy);
      investmentCost(project.account.fundingGoal, project.account.totalShares, project.account.sharesSold, shares);
    } catch (error) { toast.error(error instanceof Error ? error.message : t.project.errors.invalidShares); return; }

    setProcessing(true);
    try {
      const provider = new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
      const program = new Program(IDL as any, new PublicKey(PROGRAM_ID), provider);
      const projectPubkey = new PublicKey(pubkey);
      const [investmentPDA] = getInvestmentPDA(projectPubkey, wallet.publicKey);
      const [vaultPDA] = getVaultPDA(projectPubkey);

      const tx = await (program.methods as any)
        .invest(new BN(shares.toString()))
        .accounts({
          project: projectPubkey,
          investment: investmentPDA,
          vault: vaultPDA,
          investor: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      toast.success(`${t.project.toasts.invested} ${tx.slice(0, 8)}...`);
      setSharesToBuy("");
      loadProject();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? t.project.toasts.failed);
    } finally {
      setProcessing(false);
    }
  }

  async function handleWithdraw() {
    if (!wallet.publicKey || !wallet.signTransaction) return;
    setProcessing(true);
    try {
      const provider = new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
      const program = new Program(IDL as any, new PublicKey(PROGRAM_ID), provider);
      const projectPubkey = new PublicKey(pubkey);
      const [vaultPDA] = getVaultPDA(projectPubkey);

      const tx = await (program.methods as any)
        .withdrawFunds()
        .accounts({
          project: projectPubkey,
          vault: vaultPDA,
          artist: wallet.publicKey,
        })
        .rpc();

      toast.success(`${t.project.toasts.withdrawn} ${tx.slice(0, 8)}...`);
      loadProject();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? t.project.toasts.failed);
    } finally {
      setProcessing(false);
    }
  }

  async function handleDistributeRevenue() {
    if (!wallet.publicKey || !wallet.signTransaction) return;
    let amount: bigint;
    try { amount = parseSol(revenueAmount); }
    catch (error) { toast.error(error instanceof Error ? error.message : t.project.errors.invalidAmount); return; }

    setProcessing(true);
    try {
      const provider = new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
      const program = new Program(IDL as any, new PublicKey(PROGRAM_ID), provider);
      const projectPubkey = new PublicKey(pubkey);
      const [vaultPDA] = getVaultPDA(projectPubkey);

      const tx = await (program.methods as any)
        .distributeRevenue(new BN(amount.toString()))
        .accounts({
          project: projectPubkey,
          vault: vaultPDA,
          artist: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      toast.success(`${t.project.toasts.revenueDistributed} ${tx.slice(0, 8)}...`);
      setRevenueAmount("");
      loadProject();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? t.project.toasts.failed);
    } finally {
      setProcessing(false);
    }
  }

  async function handleClaimRevenue() {
    if (!wallet.publicKey || !wallet.signTransaction || !investment) return;
    setProcessing(true);
    try {
      const provider = new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
      const program = new Program(IDL as any, new PublicKey(PROGRAM_ID), provider);
      const projectPubkey = new PublicKey(pubkey);
      const [investmentPDA] = getInvestmentPDA(projectPubkey, wallet.publicKey);
      const [vaultPDA] = getVaultPDA(projectPubkey);

      const tx = await (program.methods as any)
        .claimRevenue()
        .accounts({
          project: projectPubkey,
          investment: investmentPDA,
          vault: vaultPDA,
          investor: wallet.publicKey,
        })
        .rpc();

      toast.success(`${t.project.toasts.revenueClaimed} ${tx.slice(0, 8)}...`);
      loadProject();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? t.project.toasts.failed);
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="pulse-loading" style={{ height: "400px" }}></div>
      </div>
    );
  }

  if (loadError) return <div className="glass-card" role="alert"><p>{loadError}</p><button className="btn-primary-tech" onClick={loadProject}>Try again</button></div>;

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4">{t.project.notFound}</h2>
        <Link href="/" className="btn-primary-tech">
          {t.nav.projects}
        </Link>
      </div>
    );
  }

  const acc = project.account;
  const availableRevenue = investment ? claimableRevenue(acc.totalRevenueDistributed, investment.account.shares, acc.totalShares, investment.account.revenueClaimed) : 0n;
  const sharesLeft = integer(acc.totalShares) - integer(acc.sharesSold);
  const pricePerShare = sharesLeft > 0n ? investmentCost(acc.fundingGoal, acc.totalShares, acc.sharesSold, 1n) : null;
  const progress = Number(integer(acc.amountRaised) * 10000n / integer(acc.fundingGoal)) / 100;
  let cost: bigint | null = null;
  let costError = '';
  if (sharesToBuy) {
    try { cost = investmentCost(acc.fundingGoal, acc.totalShares, acc.sharesSold, parseShares(sharesToBuy)); }
    catch { costError = t.project.errors.invalidShares; }
  }
  const isArtist = wallet.publicKey?.toString() === acc.artist.toString();
  const status = statusLabel(acc.status);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="glass-card">
        <h1 className="text-3xl font-bold mb-2">{acc.title}</h1>
        <p className="text-gray-600 mb-6">{acc.description}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="stat-box">
            <div className="stat-label">{t.project.artist}</div>
            <div className="stat-value text-sm">{acc.artist.toString().slice(0, 8)}...</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">{t.project.solRaised}</div>
            <div className="stat-value">{formatSol(acc.amountRaised)}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">{t.project.solGoal}</div>
            <div className="stat-value">{formatSol(acc.fundingGoal)}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">{t.status[status.toLowerCase() as keyof typeof t.status]}</div>
            <div className="stat-value text-brand-green">{status}</div>
          </div>
        </div>

        <div className="progress-bar-container mb-6">
          <div className="progress-bar-fill" style={{ width: `${Math.min(progress, 100)}%` }}></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="stat-box">
            <div className="stat-label">{t.project.sharesLeft}</div>
            <div className="stat-value">{sharesLeft.toString()}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">{t.project.pricePerShare}</div>
            <div className="stat-value">{pricePerShare === null ? '—' : formatSol(pricePerShare) + ' SOL'}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">{t.project.revShare}</div>
            <div className="stat-value">{(acc.revenueShareBps / 100).toFixed(2)}%</div>
          </div>
        </div>

        {status === "Active" && !isArtist && (
          <div className="glass-card mb-6">
            <h3 className="text-xl font-bold mb-4">{t.project.investTitle}</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="number"
                value={sharesToBuy}
                onChange={(e) => setSharesToBuy(e.target.value)}
                placeholder={t.project.sharesToBuy}
                className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 text-black focus:outline-none focus:border-black"
                min="1"
                max={sharesLeft.toString()}
                aria-label={t.project.sharesToBuy}
                step="1"
              />
              <button
                onClick={handleInvest}
                disabled={processing || !wallet.publicKey || cost === null}
                className="btn-primary-tech"
              >
                {processing ? "..." : t.project.invest}
              </button>
            </div>
            {sharesToBuy && (
              <p className="text-sm text-gray-600 mt-2 font-medium">
                {costError || `${t.project.cost}: ${formatSol(cost ?? 0n)} test SOL + network fees`}
              </p>
            )}
          </div>
        )}

        {investment && (
          <div className="glass-card mb-6">
            <h3 className="text-xl font-bold mb-4">{t.project.myInvestment}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="stat-box">
                <div className="stat-label">{t.project.sharesOwned}</div>
                <div className="stat-value">{investment.account.shares.toString()}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">{t.project.invested}</div>
                <div className="stat-value">{formatSol(investment.account.amountInvested)} SOL</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">{t.project.claimable}</div>
                <div className="stat-value text-brand-green">
                  {formatSol(availableRevenue)} SOL
                </div>
              </div>
            </div>
            {availableRevenue > 0n && (
              <button onClick={handleClaimRevenue} disabled={processing} className="btn-primary-tech w-full">
                {processing ? "..." : t.project.claim}
              </button>
            )}
          </div>
        )}

        {isArtist && (
          <div className="glass-card">
            <h3 className="text-xl font-bold mb-4">{t.project.artistControls}</h3>
            {status === "Funded" && (
              <button onClick={handleWithdraw} disabled={processing} className="btn-primary-tech w-full mb-4">
                {processing ? "..." : t.project.withdrawFunds}
              </button>
            )}
            {(status === "Funded" || status === "Released") && (
              <div>
                <label className="block text-sm text-gray-600 mb-2 font-bold uppercase">{t.project.distributeRevenue}</label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="number"
                    value={revenueAmount}
                    onChange={(e) => setRevenueAmount(e.target.value)}
                    placeholder={t.project.amountInSol}
                    aria-label={t.project.amountInSol}
                    className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 text-black focus:outline-none focus:border-black"
                    min="0.000000001"
                    step="0.000000001"
                  />
                  <button onClick={handleDistributeRevenue} disabled={processing} className="btn-primary-tech">
                    {processing ? "..." : t.project.distribute}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 text-center">
          <a
            href={`https://explorer.solana.com/address/${pubkey}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-purple hover:text-purple-400 text-sm"
          >
            {t.project.viewOnExplorer} →
          </a>
        </div>
      </div>
    </div>
  );
}


export default function ProjectDetailPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto"><div className="pulse-loading" style={{ height: "400px" }}></div></div>}>
      <ProjectDetailContent />
    </Suspense>
  );
}
