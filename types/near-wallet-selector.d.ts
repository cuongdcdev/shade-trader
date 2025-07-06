declare module '@near-wallet-selector/core' {
  export function setupWalletSelector(options: {
    network: string;
    modules: any[];
    fallbackRpcUrls?: string[];
  }): Promise<{
    wallet: (walletId: string) => Promise<{
      signMessage: (options: {
        message: string;
        recipient: string;
        nonce: Uint8Array;
        callbackUrl?: string;
      }) => Promise<{
        accountId: string;
        publicKey: string;
        signature: string;
      } | null>;
    }>;
  }>;
}

declare module '@near-wallet-selector/meteor-wallet' {
  export function setupMeteorWallet(): any;
}
