import { useMemo, useState } from "react";
import {
  createPublicShredClient,
  createPublicSyncClient,
  shredsWebSocket,
} from "shreds/viem";
import { Account, createWalletClient, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { riseTestnet } from "viem/chains";

const WALLET_STORAGE_KEY = "paint_canvas_wallet";

export function useWallet() {
  const [isResetting, setIsResetting] = useState<boolean>(false);

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
      chain: riseTestnet,
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

  const shredClient = useMemo(() => createPublicShredClient({
    chain: riseTestnet,
    transport: shredsWebSocket(), // Replace with your Shreds WebSocket endpoint
  }), []);

  const syncClient = useMemo(() => createPublicSyncClient({
    chain: riseTestnet,
    // @ts-expect-error
    transport: http(),
  }), []);

  const publicClient = useMemo(() => createPublicSyncClient({
    chain: riseTestnet,
    // @ts-expect-error
    transport: http(),
  }), []);

  return {
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
