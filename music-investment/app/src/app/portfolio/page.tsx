"use client";
import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { Music } from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import { IDL, PROGRAM_ID } from "@/utils/idl";
import { lamportsToSol, statusLabel } from "@/utils/program";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function PortfolioPage() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { t } = useLanguage();
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (wallet.publicKey) loadPortfolio();
  }, [wallet.publicKey]);

  async function loadPortfolio() {
    if (!wallet.publicKey) return;
    setLoading(true);
    try {
      const provider = new AnchorProvider(connection, wallet as any, {});
      const program = new Program(IDL as any, new PublicKey(PROGRAM_ID), provider);

      const allInvestments = await (program.account as any).investment.all([
        {
          memcmp: {
            offset: 8,
            bytes: wallet.publicKey.toBase58(),
          },
        },
      ]);

      const enriched = await Promise.all(
        allInvestments.map(async (inv: any) => {
          try {
            const proj = await (program.account as any).project.fetch(inv.account.project);
            return { investment: inv, project: proj };
          } catch {
            return null;
          }
        })
      );

      setInvestments(enriched.filter(Boolean));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (!wallet.publicKey) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-4">👛</p>
        <p className="text-gray-500">{t.portfolio.connectPrompt}</p>
      </div>
    );
  }

  const totalInvested = investments.reduce(
    (acc, i) => acc + lamportsToSol(i.investment.account.amountInvested.toNumber()),
    0
  );
  const totalClaimed = investments.reduce(
    (acc, i) => acc + lamportsToSol(i.investment.account.revenueClaimed.toNumber()),
    0
  );

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-2 text-black">{t.portfolio.title}</h1>
      <p className="text-gray-500 mb-8">{t.portfolio.subtitle}</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: t.portfolio.projectsBacked, value: investments.length },
          { label: t.portfolio.totalInvested, value: `${totalInvested.toFixed(4)} SOL` },
          { label: t.portfolio.revenueClaimed, value: `${totalClaimed.toFixed(4)} SOL` },
        ].map((s) => (
          <div key={s.label} className="bg-gray-50 border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-black">{s.value}</p>
            <p className="text-gray-500 text-sm uppercase tracking-wide font-semibold">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : investments.length === 0 ? (
        <div className="text-center p-12 bg-gray-50 border border-gray-200">
          <p className="mb-4 flex justify-center"><Music size={40} className="text-gray-400 opacity-50" /></p>
          <p className="text-xl font-semibold mb-2 text-black">No Investments Yet</p>
          <Link
            href="/"
            className="inline-block mt-4 bg-black hover:bg-gray-800 text-white px-5 py-2 text-sm font-bold uppercase tracking-wide transition-colors"
          >
            {t.portfolio.browseProjects}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {investments.map(({ investment, project }) => {
            const projectPubkey = investment.account.project.toString();
            const status = statusLabel(project.status);
            const sharesPct = (
              (investment.account.shares.toNumber() / project.totalShares.toNumber()) *
              100
            ).toFixed(2);

            let claimable = 0;
            if (project.totalRevenueDistributed.toNumber() > 0) {
              const bps =
                (investment.account.shares.toNumber() * 10000) / project.totalShares.toNumber();
              const total = (project.totalRevenueDistributed.toNumber() * bps) / 10000;
              claimable = Math.max(0, total - investment.account.revenueClaimed.toNumber());
            }

            return (
              <Link key={investment.publicKey.toString()} href={`/project/${projectPubkey}`}>
                <div className="bg-white border border-gray-200 p-5 hover:border-black transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 flex items-center justify-center text-gray-600">
                        <Music size={24} />
                      </div>
                      <div>
                        <p className="font-semibold text-black">{project.title}</p>
                        <p className="text-xs text-gray-500">{sharesPct}% {t.portfolio.ownership}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-black font-semibold">
                        {lamportsToSol(investment.account.amountInvested.toNumber()).toFixed(4)} SOL
                      </p>
                      {claimable > 0 && (
                        <p className="text-xs text-green-600">
                          {lamportsToSol(claimable).toFixed(4)} SOL {t.portfolio.claimable}
                        </p>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 ${
                          status === "Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
