declare module '@solana/wallet-adapter-react' {
  import { ReactNode } from 'react';
  
  export interface ConnectionProviderProps {
    endpoint: string;
    children: ReactNode;
  }
  
  export const ConnectionProvider: (props: ConnectionProviderProps) => JSX.Element;
  export const WalletProvider: any;
  export const useConnection: any;
  export const useWallet: any;
}

declare module '@solana/wallet-adapter-react-ui' {
  import { ReactNode } from 'react';
  
  export const WalletModalProvider: (props: { children: ReactNode }) => JSX.Element;
  export const WalletMultiButton: any;
}
