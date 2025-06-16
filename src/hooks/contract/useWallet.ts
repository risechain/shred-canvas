import { useMemo, useState } from "react";
import { Account, createWalletClient, http } from "viem";
import { generatePrivateKey } from "viem/accounts";
import { riseTestnet } from "viem/chains";

const WALLET_STORAGE_KEY = "paint_canvas_wallet";

export function useWallet() {
  const [isResetting, setIsResetting] = useState<boolean>(false);

  function getStoredWallet() {
    const stored = localStorage.getItem(WALLET_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  function setStoredWallet(address: string, privateKey: string) {
    localStorage.setItem(
      WALLET_STORAGE_KEY,
      JSON.stringify({
        address,
        privateKey,
      })
    );
  }

  function generateWalletClient(privateKey: `0x${string}` | Account) {
    const walletClient = createWalletClient({
      account: privateKey,
      chain: riseTestnet,
      transport: http(),
    });

    return walletClient;
  }

  function resetWalletClient() {
    const privateKey = generatePrivateKey();
    const walletClient = generateWalletClient(privateKey);

    setStoredWallet(walletClient.account.address, privateKey);

    return walletClient;
  }

  const wallet = useMemo(() => {
    if (isResetting) {
      setIsResetting(false);
    }

    const storedWallet = getStoredWallet();
    if (storedWallet) {
      return generateWalletClient(storedWallet.privateKey as `0x${string}`);
    } else {
      return resetWalletClient();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResetting]);

  return {
    isResetting,
    wallet,
    setIsResetting,
    getStoredWallet,
    setStoredWallet,
    generateWalletClient,
    resetWalletClient,
  };
}
