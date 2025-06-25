import { useEffect, useRef, useState } from 'react';
import { Address, PublicClient } from 'viem';
import { NonceManager } from '@/lib/NonceManager';

export function useNonceManager(address: Address | undefined, publicClient: PublicClient | undefined) {
  const nonceManagerRef = useRef<NonceManager | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the nonce manager singleton
  useEffect(() => {
    if (!nonceManagerRef.current) {
      nonceManagerRef.current = new NonceManager();
    }
  }, []);

  // Initialize nonce for the current address
  useEffect(() => {
    if (!address || !publicClient || !nonceManagerRef.current) {
      setIsInitialized(false);
      return;
    }

    const initializeNonce = async () => {
      try {
        setError(null);
        await nonceManagerRef.current!.initialize(address, publicClient);
        setIsInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize nonce manager');
        setIsInitialized(false);
      }
    };

    if (!nonceManagerRef.current.isInitialized(address)) {
      initializeNonce();
    } else {
      setIsInitialized(true);
    }
  }, [address, publicClient]);

  const getNextNonce = () => {
    if (!address || !nonceManagerRef.current || !isInitialized) {
      throw new Error('NonceManager not ready');
    }
    return nonceManagerRef.current.getNextNonce(address);
  };

  const getCurrentNonce = () => {
    if (!address || !nonceManagerRef.current || !isInitialized) {
      return 0;
    }
    return nonceManagerRef.current.getCurrentNonce(address);
  };

  const resetNonce = async () => {
    if (!address || !publicClient || !nonceManagerRef.current) {
      return;
    }
    try {
      setError(null);
      await nonceManagerRef.current.reset(address, publicClient);
      setIsInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset nonce manager');
    }
  };

  return {
    getNextNonce,
    getCurrentNonce,
    resetNonce,
    isInitialized,
    error,
  };
}