import { useEffect, useState } from "react";
import { Address, PublicClient } from "viem";
import { NonceManagerSingleton } from "@/lib/NonceManagerSingleton";
import { usePage } from "./usePage";

export function useNonceManager(
  address: Address | undefined,
  publicClient: PublicClient | undefined
) {
  const [error, setError] = useState<string | null>(null);

  /**
   * move these states to global state as custom-hooks do not retain state
   * when being accessed from a different component
   */
  const { isNonceInitialized, setIsNonceInitialized, setLocalNonce } =
    usePage();

  // Get the singleton instance
  const nonceManager = NonceManagerSingleton.getInstance();

  // Initialize nonce for the current address
  useEffect(() => {
    if (!address || !publicClient) {
      setIsNonceInitialized(false);
      return;
    }

    const initializeNonce = async () => {
      try {
        setError(null);
        await nonceManager.initialize(address, publicClient);
        setIsNonceInitialized(true);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to initialize nonce manager"
        );
        setIsNonceInitialized(false);
      }
    };

    if (!nonceManager.isInitialized(address)) {
      initializeNonce();
    } else {
      setIsNonceInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, publicClient]);

  const getNextNonce = () => {
    if (!address || !isNonceInitialized) {
      throw new Error("NonceManager not ready");
    }
    return nonceManager.getNextNonce(address);
  };

  const getCurrentNonce = () => {
    if (!address || !isNonceInitialized) {
      return 0;
    }
    const nonce = nonceManager.getCurrentNonce(address);
    setLocalNonce(nonce);

    return nonce;
  };

  const resetNonce = async () => {
    if (!address || !publicClient) {
      return;
    }
    try {
      setError(null);
      await nonceManager.reset(address, publicClient);
      setIsNonceInitialized(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reset nonce manager"
      );
    }
  };

  return {
    getNextNonce,
    getCurrentNonce,
    resetNonce,
    isNonceInitialized,
    error,
  };
}
