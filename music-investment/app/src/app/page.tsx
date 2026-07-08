"use client";
import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { IDL, PROGRAM_ID } from "@/utils/idl";
import { lamportsToSol, statusLabel } from "@/utils/program";
import { demoAsAccounts } from "@/utils/demoData";
import ProjectCard from "@/components/ProjectCard";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { Music, Rocket, Coins, TrendingUp, ShieldCheck, Zap, PieChart, Lock } from "lucide-react";

export default function HomePage() {
  const { connection } = useConnection();
  const { t } = useLanguage();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "Active" | "Funded" | "Released">("all");
  const [sort, setSort] = useState<"newest" | "funded" | "yield">("newest");

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

  // Fall back to preview listings when the chain has no projects yet, so the
  // marketplace is always populated and browsable (clearly labelled in the UI).
  const usingDemo = !loading && projects.length === 0;
  const source = usingDemo ? demoAsAccounts() : projects;

  const activeProjects = source.filter((p) => statusLabel(p.account.status) === "Active").length;
  const totalRaised = source.reduce((acc, p) => acc + lamportsToSol(p.account.amountRaised.toNumber()), 0);

  const visibleProjects = source
    .filter((p) => filter === "all" || statusLabel(p.account.status) === filter)
    .filter((p) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        p.account.title.toLowerCase().includes(q) ||
        p.account.description.toLowerCase().includes(q) ||
        p.account.artist.toString().toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sort === "funded") {
        const pa = a.account.amountRaised.toNumber() / a.account.fundingGoal.toNumber();
        const pb = b.account.amountRaised.toNumber() / b.account.fundingGoal.toNumber();
        return pb - pa;
      }
      if (sort === "yield") {
        return b.account.revenueShareBps - a.account.revenueShareBps;
      }
      // newest (default) — createdAt is a unix timestamp
      return (b.account.createdAt?.toNumber?.() ?? 0) - (a.account.createdAt?.toNumber?.() ?? 0);
    });

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
            <div className="stat-item-value">{source.length || "0"}</div>
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

      {/* How it works */}
      <section className="how-section">
        <div className="section-inner">
          <div className="section-heading-center">
            <h2 className="section-title-center">{t.howItWorks.title}</h2>
            <p className="section-subtitle-center">{t.howItWorks.subtitle}</p>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <span className="step-num">01</span>
              <div className="step-icon"><Rocket size={26} /></div>
              <h3 className="step-title">{t.howItWorks.step1Title}</h3>
              <p className="step-desc">{t.howItWorks.step1Desc}</p>
            </div>
            <div className="step-card">
              <span className="step-num">02</span>
              <div className="step-icon"><Coins size={26} /></div>
              <h3 className="step-title">{t.howItWorks.step2Title}</h3>
              <p className="step-desc">{t.howItWorks.step2Desc}</p>
            </div>
            <div className="step-card">
              <span className="step-num">03</span>
              <div className="step-icon"><TrendingUp size={26} /></div>
              <h3 className="step-title">{t.howItWorks.step3Title}</h3>
              <p className="step-desc">{t.howItWorks.step3Desc}</p>
            </div>
          </div>
        </div>
      </section>

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
        ) : source.length === 0 ? (
          <div className="glass-card empty-state">
            <div className="empty-icon"><Music size={48} /></div>
            <h3 className="empty-title">{t.home.networkEmpty}</h3>
            <p className="empty-desc">{t.home.networkEmptyDesc}</p>
            <Link href="/create" className="btn-primary-tech sm">{t.home.deployProject}</Link>
          </div>
        ) : (
          <>
            {usingDemo && (
              <div className="preview-banner">
                <span className="preview-dot" />
                {t.home.previewBanner}
              </div>
            )}
            <div className="market-controls">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.home.searchPlaceholder}
                className="market-search"
              />
              <div className="market-filters">
                {([
                  ["all", t.home.filterAll],
                  ["Active", t.home.filterActive],
                  ["Funded", t.home.filterFunded],
                  ["Released", t.home.filterReleased],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key as typeof filter)}
                    className={`market-filter ${filter === key ? "active" : ""}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="market-sort"
                aria-label="Sort projects"
              >
                <option value="newest">{t.home.sortNewest}</option>
                <option value="funded">{t.home.sortMostFunded}</option>
                <option value="yield">{t.home.sortHighestYield}</option>
              </select>
            </div>

            {visibleProjects.length === 0 ? (
              <div className="glass-card empty-state">
                <div className="empty-icon"><Music size={48} /></div>
                <h3 className="empty-title">{t.home.noResults}</h3>
                <p className="empty-desc">{t.home.noResultsDesc}</p>
              </div>
            ) : (
              <div className="projects-grid">
                {visibleProjects.map((p) => (
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
          </>
        )}
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="section-inner">
          <div className="section-heading-center">
            <h2 className="section-title-center">{t.features.title}</h2>
            <p className="section-subtitle-center">{t.features.subtitle}</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon"><ShieldCheck size={24} /></div>
              <h3 className="feature-title">{t.features.f1Title}</h3>
              <p className="feature-desc">{t.features.f1Desc}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><Zap size={24} /></div>
              <h3 className="feature-title">{t.features.f2Title}</h3>
              <p className="feature-desc">{t.features.f2Desc}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><PieChart size={24} /></div>
              <h3 className="feature-title">{t.features.f3Title}</h3>
              <p className="feature-desc">{t.features.f3Desc}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><Lock size={24} /></div>
              <h3 className="feature-title">{t.features.f4Title}</h3>
              <p className="feature-desc">{t.features.f4Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section">
        <div className="section-inner-narrow">
          <h2 className="section-title-center">{t.faq.title}</h2>
          <div className="faq-list">
            <details className="faq-item">
              <summary className="faq-q">{t.faq.q1}</summary>
              <p className="faq-a">{t.faq.a1}</p>
            </details>
            <details className="faq-item">
              <summary className="faq-q">{t.faq.q2}</summary>
              <p className="faq-a">{t.faq.a2}</p>
            </details>
            <details className="faq-item">
              <summary className="faq-q">{t.faq.q3}</summary>
              <p className="faq-a">{t.faq.a3}</p>
            </details>
            <details className="faq-item">
              <summary className="faq-q">{t.faq.q4}</summary>
              <p className="faq-a">{t.faq.a4}</p>
            </details>
          </div>
        </div>
      </section>
    </div>
  );
}
