"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { IDL, PROGRAM_ID } from "@/utils/idl";
import { getProjectPDA, getVaultPDA, getInvestmentPDA, lamportsToSol, statusLabel } from "@/utils/program";
import toast from "react-hot-toast";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";

export default function ProjectDetailPage() {
  const params = useParams();
  const pubkey = params?.pubkey as string;
  const { connection } = useConnection();
  const wallet = useWallet();
  const { t } = useLanguage();

  const [project, setProject] = useState<any>(null);
  const [investment, setInvestment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sharesToBuy, setSharesToBuy] = useState("");
  const [revenueAmount, setRevenueAmount] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (pubkey) loadProject();
  }, [pubkey, wallet.publicKey]);

  async function loadProject() {
    try {
      setLoading(true);
      const provider = new AnchorProvider(connection, {} as any, {});
      const program = new Program(IDL as any, new PublicKey(PROGRAM_ID), provider);
      const projectPubkey = new PublicKey(pubkey);
      const acc = await (program.account as any).project.fetch(projectPubkey);
      setProject({ publicKey: projectPubkey, account: acc });

      if (wallet.publicKey) {
        try {
          const [investmentPDA] = getInvestmentPDA(projectPubkey, wallet.publicKey);
          const invAcc = await (program.account as any).investment.fetch(investmentPDA);
          setInvestment({ publicKey: investmentPDA, account: invAcc });
        } catch (e) {
          setInvestment(null);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(t.project.errors.loadFailed);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvest() {
    if (!wallet.publicKey || !wallet.signTransaction) {
      toast.error(t.project.errors.connectWallet);
      return;
    }
    const shares = parseInt(sharesToBuy);
    if (isNaN(shares) || shares <= 0) {
      toast.error(t.project.errors.invalidShares);
      return;
    }

    setProcessing(true);
    try {
      const provider = new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
      const program = new Program(IDL as any, new PublicKey(PROGRAM_ID), provider);
      const projectPubkey = new PublicKey(pubkey);
      const [investmentPDA] = getInvestmentPDA(projectPubkey, wallet.publicKey);
      const [vaultPDA] = getVaultPDA(projectPubkey);

      const tx = await (program.methods as any)
        .invest(new BN(shares))
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
    const amount = parseFloat(revenueAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t.project.errors.invalidAmount);
      return;
    }

    setProcessing(true);
    try {
      const provider = new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
      const program = new Program(IDL as any, new PublicKey(PROGRAM_ID), provider);
      const projectPubkey = new PublicKey(pubkey);
      const [vaultPDA] = getVaultPDA(projectPubkey);

      const tx = await (program.methods as any)
        .distributeRevenue(new BN(Math.floor(amount * 1e9)))
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
  const sharesLeft = acc.totalShares.toNumber() - acc.sharesSold.toNumber();
  const pricePerShare = lamportsToSol(acc.fundingGoal.toNumber()) / acc.totalShares.toNumber();
  const raised = lamportsToSol(acc.amountRaised.toNumber());
  const goal = lamportsToSol(acc.fundingGoal.toNumber());
  const progress = (raised / goal) * 100;
  const isArtist = wallet.publicKey?.toString() === acc.artist.toString();
  const status = statusLabel(acc.status);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="glass-card">
        <h1 className="text-3xl font-bold mb-2">{acc.title}</h1>
        <p className="text-gray-400 mb-6">{acc.description}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="stat-box">
            <div className="stat-label">{t.project.artist}</div>
            <div className="stat-value text-sm">{acc.artist.toString().slice(0, 8)}...</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">{t.project.solRaised}</div>
            <div className="stat-value">{raised.toFixed(2)}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">{t.project.solGoal}</div>
            <div className="stat-value">{goal.toFixed(2)}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">{t.status[status.toLowerCase() as keyof typeof t.status]}</div>
            <div className="stat-value text-brand-green">{status}</div>
          </div>
        </div>

        <div className="progress-bar-container mb-6">
          <div className="progress-bar-fill" style={{ width: `${Math.min(progress, 100)}%` }}></div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="stat-box">
            <div className="stat-label">{t.project.sharesLeft}</div>
            <div className="stat-value">{sharesLeft}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">{t.project.pricePerShare}</div>
            <div className="stat-value">{pricePerShare.toFixed(4)} SOL</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">{t.project.revShare}</div>
            <div className="stat-value">{(acc.revenueShareBps / 100).toFixed(2)}%</div>
          </div>
        </div>

        {status === "Active" && !isArtist && (
          <div className="glass-card mb-6">
            <h3 className="text-xl font-bold mb-4">{t.project.investTitle}</h3>
            <div className="flex gap-4">
              <input
                type="number"
                value={sharesToBuy}
                onChange={(e) => setSharesToBuy(e.target.value)}
                placeholder={t.project.sharesToBuy}
                className="flex-1 bg-brand-card border border-brand-border rounded-lg px-4 py-3 text-white"
                min="1"
                max={sharesLeft}
              />
              <button
                onClick={handleInvest}
                disabled={processing || !wallet.publicKey}
                className="btn-primary-tech"
              >
                {processing ? "..." : t.project.invest}
              </button>
            </div>
            {sharesToBuy && (
              <p className="text-sm text-gray-400 mt-2">
                {t.project.cost}: {(parseFloat(sharesToBuy || "0") * pricePerShare).toFixed(4)} SOL
              </p>
            )}
          </div>
        )}

        {investment && (
          <div className="glass-card mb-6">
            <h3 className="text-xl font-bold mb-4">{t.project.myInvestment}</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="stat-box">
                <div className="stat-label">{t.project.sharesOwned}</div>
                <div className="stat-value">{investment.account.sharesOwned.toNumber()}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">{t.project.invested}</div>
                <div className="stat-value">{lamportsToSol(investment.account.amountInvested.toNumber()).toFixed(4)} SOL</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">{t.project.claimable}</div>
                <div className="stat-value text-brand-green">
                  {lamportsToSol(investment.account.claimableRevenue.toNumber()).toFixed(4)} SOL
                </div>
              </div>
            </div>
            {investment.account.claimableRevenue.toNumber() > 0 && (
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
                <label className="block text-sm text-gray-300 mb-2">{t.project.distributeRevenue}</label>
                <div className="flex gap-4">
                  <input
                    type="number"
                    value={revenueAmount}
                    onChange={(e) => setRevenueAmount(e.target.value)}
                    placeholder={t.project.amountInSol}
                    className="flex-1 bg-brand-card border border-brand-border rounded-lg px-4 py-3 text-white"
                    min="0.001"
                    step="0.001"
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
