"use client";
import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { IDL, PROGRAM_ID } from "@/utils/idl";
import { lamportsToSol, statusLabel } from "@/utils/program";
import ProjectCard from "@/components/ProjectCard";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { Music } from "lucide-react";

export default function HomePage() {
  const { connection } = useConnection();
  const { t } = useLanguage();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, [connection]);

  async function loadProjects() {
    try {
      setLoading(true);
      const provider = new AnchorProvider(connection, {} as any, {});
      const program = new Program(IDL as any, new PublicKey(PROGRAM_ID), provider);
      const fetched = await (program.account as any).project.all();
      setProjects(fetched);
    } catch (e) {
      console.error("Failed to load projects:", e);
    } finally {
      setLoading(false);
    }
  }

  const activeProjects = projects.filter((p) => statusLabel(p.account.status) === "Active").length;
  const totalRaised = projects.reduce((acc, p) => acc + lamportsToSol(p.account.amountRaised.toNumber()), 0);

  return (
    <div className="home-wrapper">
      {/* Hero — Celer-style centered big title */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="badge-pill">
            <span className="live-dot"></span> {t.home.badge}
          </div>
          <h1 className="hero-title">
            {t.home.heroTitle1}<br/>
            <span className="gradient-text">{t.home.heroTitle2}</span>{t.home.heroTitle3 ? ` ${t.home.heroTitle3}` : ""}
          </h1>
          <p className="hero-subtitle">{t.home.heroSubtitle}</p>
          <div className="btn-group">
            <Link href="/create" className="btn-primary-tech">
              {t.home.launchProject}
            </Link>
            <a href="#projects" className="btn-outline-tech">
              {t.home.exploreNetwork}
            </a>
          </div>
        </div>
      </section>

      {/* Stats bar — Celer "Fast · Secure · Low cost" style */}
      <div className="global-stats-wrapper">
        <div className="global-stats-bar">
          <div className="stat-item">
            <h4 className="stat-item-title">{t.home.totalProjects}</h4>
            <div className="stat-item-value">{projects.length || "0"}</div>
          </div>
          <div className="stat-item separator"></div>
          <div className="stat-item">
            <h4 className="stat-item-title">{t.home.totalRaised}</h4>
            <div className="stat-item-value">{totalRaised.toFixed(2)} SOL</div>
          </div>
          <div className="stat-item separator"></div>
          <div className="stat-item">
            <h4 className="stat-item-title">{t.home.activeNow}</h4>
            <div className="stat-item-value">{activeProjects}</div>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <section id="projects" className="content-section">
        <div className="section-header">
          <h2 className="section-title">{t.home.networkProjects}</h2>
          <button onClick={loadProjects} className="btn-refresh">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C15.228 3 18.0581 4.70428 19.6455 7.21832M19.6455 7.21832H15.6455M19.6455 7.21832V3.21832" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t.home.refreshState}
          </button>
        </div>

        {loading ? (
          <div className="projects-grid">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="pulse-loading"></div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="glass-card empty-state">
            <div className="empty-icon"><Music size={48} /></div>
            <h3 className="empty-title">{t.home.networkEmpty}</h3>
            <p className="empty-desc">{t.home.networkEmptyDesc}</p>
            <Link href="/create" className="btn-primary-tech sm">{t.home.deployProject}</Link>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((p) => (
              <ProjectCard
                key={p.publicKey.toString()}
                pubkey={p.publicKey.toString()}
                title={p.account.title}
                description={p.account.description}
                artist={p.account.artist.toString()}
                fundingGoal={p.account.fundingGoal.toNumber()}
                amountRaised={p.account.amountRaised.toNumber()}
                totalShares={p.account.totalShares.toNumber()}
                sharesSold={p.account.sharesSold.toNumber()}
                revenueShareBps={p.account.revenueShareBps}
                status={p.account.status}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
