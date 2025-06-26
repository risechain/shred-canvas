import { useMemo, useState } from "react";
import {
  createPublicShredClient,
  createPublicSyncClient,
  shredsWebSocket,
} from "shreds/viem";
import { Account, createPublicClient, createWalletClient, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { useNetworkConfig } from "./useNetworkConfig";

const WALLET_STORAGE_KEY = "paint_canvas_wallet";

export function useWallet() {
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const { chain } = useNetworkConfig();

  function getStoredWallet() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(WALLET_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } else {
      return null;
    }
  }

  function setStoredWallet(address: string, privateKey: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        WALLET_STORAGE_KEY,
        JSON.stringify({
          address,
          privateKey,
        })
      );
    }
  }

  function generateWalletClient(account: `0x${string}` | Account) {
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(),
    });
    return walletClient;
  }

  function resetWalletClient() {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);

    setStoredWallet(account.address, privateKey);
    return generateWalletClient(account);
  }

  const wallet = useMemo(() => {
    if (isResetting) {
      setIsResetting(false);
    }

    const storedWallet = getStoredWallet();
    if (storedWallet) {
      return generateWalletClient(storedWallet.address as `0x${string}`);
    } else {
      return resetWalletClient();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResetting]);

  const shredClient = useMemo(
    () =>
      createPublicShredClient({
        chain,
        transport: shredsWebSocket("wss://indexing.testnet.riselabs.xyz/ws"), // Replace with your Shreds WebSocket endpoint
      }),
    []
  );

  const syncClient = useMemo(
    () =>
      createPublicSyncClient({
        chain,
        // @ts-expect-error Shreds SDK type incompatibility with standard transport
        transport: http(),
      }),
    []
  );

  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain,
        transport: http(),
      }),
    []
  );

  // Get the account from stored wallet
  const account = useMemo(() => {
    const storedWallet = getStoredWallet();
    if (storedWallet?.privateKey) {
      return privateKeyToAccount(storedWallet.privateKey);
    }
    return null;
  }, []);

  return {
    account,
    publicClient,
    syncClient,
    shredClient,
    isResetting,
    wallet,
    setIsResetting,
    getStoredWallet,
    setStoredWallet,
    generateWalletClient,
    resetWalletClient,
  };
}
