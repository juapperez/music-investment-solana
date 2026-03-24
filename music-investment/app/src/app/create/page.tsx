"use client";
import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { IDL, PROGRAM_ID } from "@/utils/idl";
import { getProjectPDA, getVaultPDA } from "@/utils/program";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

export default function CreateProjectPage() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const router = useRouter();
  const { t } = useLanguage();

  const [form, setForm] = useState({
    title: "",
    description: "",
    fundingGoalSol: "",
    totalShares: "",
    revenueSharePct: "",
  });
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet.publicKey || !wallet.signTransaction) {
      toast.error(t.create.errors.connectWallet);
      return;
    }

    const fundingGoalLamports = Math.floor(parseFloat(form.fundingGoalSol) * 1e9);
    const totalShares = parseInt(form.totalShares);
    const revenueShareBps = Math.round(parseFloat(form.revenueSharePct) * 100);

    if (!form.title || !form.description || isNaN(fundingGoalLamports) || isNaN(totalShares)) {
      toast.error(t.create.errors.fillFields);
      return;
    }
    if (revenueShareBps < 0 || revenueShareBps > 10000) {
      toast.error(t.create.errors.revenueRange);
      return;
    }

    setLoading(true);
    try {
      const provider = new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
      const program = new Program(IDL as any, new PublicKey(PROGRAM_ID), provider);

      const [projectPDA] = getProjectPDA(wallet.publicKey, form.title);
      const [vaultPDA] = getVaultPDA(projectPDA);

      const tx = await (program.methods as any)
        .createProject(
          form.title,
          form.description,
          new BN(fundingGoalLamports),
          new BN(totalShares),
          revenueShareBps
        )
        .accounts({
          project: projectPDA,
          vault: vaultPDA,
          artist: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      toast.success(`${t.create.toasts.created} ${tx.slice(0, 8)}...`);
      router.push(`/project/${projectPDA.toString()}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? t.create.toasts.failed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-2 text-black">{t.create.title}</h1>
      <p className="text-gray-500 mb-8">{t.create.subtitle}</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm text-gray-600 mb-1 font-semibold uppercase tracking-wide">{t.create.projectTitle}</label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            maxLength={64}
            placeholder={t.create.projectTitlePlaceholder}
            className="w-full bg-white border border-gray-200 px-4 py-3 text-black placeholder-gray-400 focus:outline-none focus:border-black transition-colors"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1 font-semibold uppercase tracking-wide">{t.create.description}</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            maxLength={256}
            rows={3}
            placeholder={t.create.descriptionPlaceholder}
            className="w-full bg-white border border-gray-200 px-4 py-3 text-black placeholder-gray-400 focus:outline-none focus:border-black resize-none transition-colors"
            required
          />
          <p className="text-xs text-gray-400 mt-1">{form.description.length}/256</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1 font-semibold uppercase tracking-wide">{t.create.fundingGoal}</label>
            <input
              name="fundingGoalSol"
              value={form.fundingGoalSol}
              onChange={handleChange}
              type="number"
              min="0.001"
              step="0.001"
              placeholder="10"
              className="w-full bg-white border border-gray-200 px-4 py-3 text-black placeholder-gray-400 focus:outline-none focus:border-black transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1 font-semibold uppercase tracking-wide">{t.create.totalShares}</label>
            <input
              name="totalShares"
              value={form.totalShares}
              onChange={handleChange}
              type="number"
              min="1"
              step="1"
              placeholder="1000"
              className="w-full bg-white border border-gray-200 px-4 py-3 text-black placeholder-gray-400 focus:outline-none focus:border-black transition-colors"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1 font-semibold uppercase tracking-wide">{t.create.revenueShare}</label>
          <input
            name="revenueSharePct"
            value={form.revenueSharePct}
            onChange={handleChange}
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="30"
            className="w-full bg-white border border-gray-200 px-4 py-3 text-black placeholder-gray-400 focus:outline-none focus:border-black transition-colors"
            required
          />
          <p className="text-xs text-gray-400 mt-1">{t.create.revenueShareHint}</p>
        </div>

        {form.fundingGoalSol && form.totalShares && (
          <div className="bg-gray-50 border border-gray-200 p-4 text-sm">
            <p className="text-gray-500 mb-2 font-semibold uppercase text-xs tracking-wide">{t.create.preview}</p>
            <div className="flex justify-between text-gray-700">
              <span>{t.create.pricePerShare}</span>
              <span className="text-black font-bold">
                {(parseFloat(form.fundingGoalSol || "0") / parseInt(form.totalShares || "1")).toFixed(4)} SOL
              </span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !wallet.publicKey}
          className="w-full bg-black hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 font-bold uppercase tracking-wide transition-colors"
        >
          {loading ? t.create.creating : !wallet.publicKey ? t.create.connectWallet : t.create.createProject}
        </button>
      </form>
    </div>
  );
}
