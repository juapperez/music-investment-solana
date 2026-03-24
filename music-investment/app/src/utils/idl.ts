// Auto-generated IDL — replace with actual IDL after `anchor build`
export const IDL = {
  version: "0.1.0",
  name: "music_investment",
  instructions: [
    {
      name: "createProject",
      accounts: [
        { name: "project", isMut: true, isSigner: false },
        { name: "vault", isMut: true, isSigner: false },
        { name: "artist", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "title", type: "string" },
        { name: "description", type: "string" },
        { name: "fundingGoal", type: "u64" },
        { name: "totalShares", type: "u64" },
        { name: "revenueShareBps", type: "u16" },
      ],
    },
    {
      name: "invest",
      accounts: [
        { name: "project", isMut: true, isSigner: false },
        { name: "vault", isMut: true, isSigner: false },
        { name: "investment", isMut: true, isSigner: false },
        { name: "investor", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [{ name: "sharesToBuy", type: "u64" }],
    },
    {
      name: "withdrawFunds",
      accounts: [
        { name: "project", isMut: true, isSigner: false },
        { name: "vault", isMut: true, isSigner: false },
        { name: "artist", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: "distributeRevenue",
      accounts: [
        { name: "project", isMut: true, isSigner: false },
        { name: "vault", isMut: true, isSigner: false },
        { name: "artist", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [{ name: "amount", type: "u64" }],
    },
    {
      name: "claimRevenue",
      accounts: [
        { name: "project", isMut: false, isSigner: false },
        { name: "vault", isMut: true, isSigner: false },
        { name: "investment", isMut: true, isSigner: false },
        { name: "investor", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "Project",
      type: {
        kind: "struct",
        fields: [
          { name: "artist", type: "publicKey" },
          { name: "title", type: "string" },
          { name: "description", type: "string" },
          { name: "fundingGoal", type: "u64" },
          { name: "totalShares", type: "u64" },
          { name: "sharesSold", type: "u64" },
          { name: "amountRaised", type: "u64" },
          { name: "revenueShareBps", type: "u16" },
          { name: "status", type: { defined: "ProjectStatus" } },
          { name: "totalRevenueDistributed", type: "u64" },
          { name: "createdAt", type: "i64" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "Investment",
      type: {
        kind: "struct",
        fields: [
          { name: "investor", type: "publicKey" },
          { name: "project", type: "publicKey" },
          { name: "shares", type: "u64" },
          { name: "amountInvested", type: "u64" },
          { name: "revenueClaimed", type: "u64" },
          { name: "bump", type: "u8" },
        ],
      },
    },
  ],
  types: [
    {
      name: "ProjectStatus",
      type: {
        kind: "enum",
        variants: [
          { name: "Active" },
          { name: "Funded" },
          { name: "Released" },
          { name: "Cancelled" },
        ],
      },
    },
  ],
  errors: [],
} as const;

export const PROGRAM_ID = "7gyrL4T4kUXQwpGuU95QnwUsdVJ1Z5AhGeXrHY63PiwK";
