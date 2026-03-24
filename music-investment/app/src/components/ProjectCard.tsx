"use client";
import Link from "next/link";
import { Music } from "lucide-react";
import { lamportsToSol, statusLabel } from "@/utils/program";
import { useLanguage } from "@/context/LanguageContext";

export interface ProjectCardProps {
  pubkey: string;
  title: string;
  description: string;
  artist: string;
  fundingGoal: number;
  amountRaised: number;
  totalShares: number;
  sharesSold: number;
  revenueShareBps: number;
  status: any;
}

export default function ProjectCard({
  pubkey,
  title,
  description,
  artist,
  fundingGoal,
  amountRaised,
  totalShares,
  sharesSold,
  revenueShareBps,
  status,
}: ProjectCardProps) {
  const { t } = useLanguage();
  const progress = fundingGoal > 0 ? Math.min((amountRaised / fundingGoal) * 100, 100) : 0;
  const label = statusLabel(status);
  const sharesLeft = totalShares - sharesSold;
  const pricePerShare = totalShares > 0 ? lamportsToSol(fundingGoal / totalShares) : 0;

  return (
    <Link href={`/project?id=${pubkey}`} style={{ textDecoration: "none" }}>
      <div className="glass-outer">
        <div className="glass-card project-card">
          <div className="card-header">
            <div className="card-artist-info">
              <div className="artist-avatar"><Music size={20} /></div>
              <div>
                <h3 className="project-title">{title}</h3>
                <p className="artist-address">
                  {artist.slice(0, 4)}...{artist.slice(-4)}
                </p>
              </div>
            </div>
            <span className={`status-badge status-${label.toLowerCase()}`}>{label}</span>
          </div>

          <p className="project-desc">{description}</p>

          <div className="progress-section">
            <div className="progress-labels">
              <span>{lamportsToSol(amountRaised).toFixed(2)} SOL raised</span>
              <span>{lamportsToSol(fundingGoal).toFixed(2)} SOL goal</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-value">{progress.toFixed(1)}%</div>
          </div>

          <div className="card-stats">
            <div className="stat-pill">
              <p className="stat-val">{sharesLeft}</p>
              <p className="stat-name">{t.card.sharesLeft}</p>
            </div>
            <div className="stat-pill">
              <p className="stat-val">{pricePerShare.toFixed(3)}</p>
              <p className="stat-name">{t.card.solPerShare}</p>
            </div>
            <div className="stat-pill">
              <p className="stat-val">{(revenueShareBps / 100).toFixed(0)}%</p>
              <p className="stat-name">{t.card.revShare}</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
