import { useEffect, useRef, useState } from "react";
import { Address, PublicClient } from "viem";
import { NonceManager } from "@/lib/NonceManager";
import { usePage } from "./usePage";

export function useNonceManager(
  address: Address | undefined,
  publicClient: PublicClient | undefined
) {
  const nonceManagerRef = useRef<NonceManager | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * move these states to global state as custom-hooks do not retain state
   * when being accessed from a different component
   */
  const { isNonceInitialized, setIsNonceInitialized, setLocalNonce } =
    usePage();

  // Initialize the nonce manager singleton
  useEffect(() => {
    if (!nonceManagerRef.current) {
      nonceManagerRef.current = new NonceManager();
    }
  }, []);

  // Initialize nonce for the current address
  useEffect(() => {
    if (!address || !publicClient || !nonceManagerRef.current) {
      setIsNonceInitialized(false);
      return;
    }

    const initializeNonce = async () => {
      try {
        setError(null);
        await nonceManagerRef.current!.initialize(address, publicClient);
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

    if (!nonceManagerRef.current.isInitialized(address)) {
      initializeNonce();
    } else {
      setIsNonceInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, publicClient]);

  const getNextNonce = () => {
    if (!address || !nonceManagerRef.current || !isNonceInitialized) {
      throw new Error("NonceManager not ready");
    }
    return nonceManagerRef.current.getNextNonce(address);
  };

  const getCurrentNonce = () => {
    if (!address || !nonceManagerRef.current || !isNonceInitialized) {
      return 0;
    }
    const nonce = nonceManagerRef.current.getCurrentNonce(address);
    setLocalNonce(nonce);

    return nonce;
  };

  const resetNonce = async () => {
    if (!address || !publicClient || !nonceManagerRef.current) {
      return;
    }
    try {
      setError(null);
      await nonceManagerRef.current.reset(address, publicClient);
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
