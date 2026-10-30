"use client";
import { ReactNode, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { DEVNET_RPC } from "@/utils/program";

// Required CSS for wallet modal
import "@solana/wallet-adapter-react-ui/styles.css";

export const WalletContextProvider = ({ children }: { children: ReactNode }) => {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={DEVNET_RPC} config={{ commitment: "confirmed", disableRetryOnRateLimit: true, fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20000) }) }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
