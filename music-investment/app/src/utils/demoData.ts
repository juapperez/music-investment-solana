// Preview listings shown when the on-chain program returns no projects (e.g.
// before anything is deployed/seeded, or on first load). They keep the
// marketplace looking alive and fully browsable. They are clearly labelled as
// preview data in the UI and are NOT investable — the invest action is disabled
// on a demo detail page. Real on-chain projects always take precedence.

const SOL = 1_000_000_000;

export interface DemoProject {
  id: string;
  title: string;
  description: string;
  artist: string;
  fundingGoalLamports: number;
  amountRaisedLamports: number;
  totalShares: number;
  sharesSold: number;
  revenueShareBps: number;
  status: "Active" | "Funded" | "Released";
  createdAt: number;
}

const now = Math.floor(Date.now() / 1000);

export const DEMO_PROJECTS: DemoProject[] = [
  {
    id: "demo-neon-dreams",
    title: "Neon Dreams EP",
    description:
      "An upcoming synthwave EP exploring cybernetic themes and neon cityscapes. Seven tracks, mastered analog.",
    artist: "7xKq9fPa4mVn2sQdRt8uWy3bZc6hJkLm9nPq2rSt4uVw",
    fundingGoalLamports: 2 * SOL,
    amountRaisedLamports: 0.6 * SOL,
    totalShares: 1000,
    sharesSold: 300,
    revenueShareBps: 2000,
    status: "Active",
    createdAt: now - 3 * 86400,
  },
  {
    id: "demo-echoes-void",
    title: "Echoes of the Void",
    description:
      "A sprawling ambient techno album designed for deep space exploration and late-night studio sessions.",
    artist: "9mBv3cXz5nQw8rTy2uPa6sDf4gHj7kLm3nBv5cXz8rTy",
    fundingGoalLamports: 0.5 * SOL,
    amountRaisedLamports: 0.5 * SOL,
    totalShares: 500,
    sharesSold: 500,
    revenueShareBps: 1500,
    status: "Funded",
    createdAt: now - 9 * 86400,
  },
  {
    id: "demo-midnight-frequencies",
    title: "Midnight Frequencies",
    description:
      "A lo-fi hip-hop tape recorded on analog gear for late-night listening. Warm, dusty, and hypnotic.",
    artist: "3nBv5cXz8rTy2uPa6sDf4gHj7kLm9mBv3cXz5nQw8rTy",
    fundingGoalLamports: 1 * SOL,
    amountRaisedLamports: 0.25 * SOL,
    totalShares: 800,
    sharesSold: 200,
    revenueShareBps: 2500,
    status: "Active",
    createdAt: now - 1 * 86400,
  },
  {
    id: "demo-golden-hour",
    title: "Golden Hour",
    description:
      "A sun-soaked indie pop record about long summers and short goodbyes. Ten songs, live-band production.",
    artist: "5cXz8rTy2uPa6sDf4gHj7kLm9nBv3cXz5nQw8rTy2uPa",
    fundingGoalLamports: 3 * SOL,
    amountRaisedLamports: 1.8 * SOL,
    totalShares: 1500,
    sharesSold: 900,
    revenueShareBps: 1800,
    status: "Active",
    createdAt: now - 5 * 86400,
  },
  {
    id: "demo-concrete-jungle",
    title: "Concrete Jungle",
    description:
      "Gritty boom-bap rap catalog with a decade of streaming history. Proven, steady monthly royalties.",
    artist: "8rTy2uPa6sDf4gHj7kLm9nBv3cXz5nQw8rTy2uPa6sDf",
    fundingGoalLamports: 4 * SOL,
    amountRaisedLamports: 4 * SOL,
    totalShares: 2000,
    sharesSold: 2000,
    revenueShareBps: 3000,
    status: "Released",
    createdAt: now - 20 * 86400,
  },
  {
    id: "demo-aurora",
    title: "Aurora",
    description:
      "Melodic electronic project blending organic instruments with modular synths. Festival-ready singles.",
    artist: "2uPa6sDf4gHj7kLm9nBv3cXz5nQw8rTy2uPa6sDf4gHj",
    fundingGoalLamports: 1.5 * SOL,
    amountRaisedLamports: 0.675 * SOL,
    totalShares: 750,
    sharesSold: 340,
    revenueShareBps: 2200,
    status: "Active",
    createdAt: now - 2 * 86400,
  },
];

export function getDemoProject(id: string): DemoProject | undefined {
  return DEMO_PROJECTS.find((p) => p.id === id);
}

/** Shape DEMO_PROJECTS like the on-chain `program.account.project.all()` result
 *  so the homepage can render them through the same ProjectCard path. */
export function demoAsAccounts() {
  return DEMO_PROJECTS.map((p) => ({
    publicKey: { toString: () => p.id },
    account: {
      title: p.title,
      description: p.description,
      artist: { toString: () => p.artist },
      fundingGoal: { toNumber: () => p.fundingGoalLamports },
      amountRaised: { toNumber: () => p.amountRaisedLamports },
      totalShares: { toNumber: () => p.totalShares },
      sharesSold: { toNumber: () => p.sharesSold },
      revenueShareBps: p.revenueShareBps,
      status: { [p.status.toLowerCase()]: {} },
      createdAt: { toNumber: () => p.createdAt },
    },
  }));
}
