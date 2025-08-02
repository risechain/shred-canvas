"use client";

import { createContext, ReactNode, useCallback, useState } from "react";
import { PublicClient, WalletClient } from "viem";

export type Topic = {
  topicId: number;
  topicName: string;
  averageRating: number;
  userCountRating: number;
};

type FeedbackProviderProps = {
  children: ReactNode;
};

type FeedbackProviderValues = {
  publicClient?: PublicClient;
  walletClient?: WalletClient;
  userId?: string;
  setUserId: (userId?: string) => void;
};

export const FeedbackContext = createContext<FeedbackProviderValues>({
  publicClient: undefined,
  walletClient: undefined,
  userId: undefined,
  setUserId: () => {},
});

export function FeedbackProvider(props: Readonly<FeedbackProviderProps>) {
  const { children } = props;

  const [userId, setUserId] = useState<string | undefined>();

  const handleSetUserId = useCallback((userId?: string) => {
    setUserId(userId);
  }, []);

  return (
    <FeedbackContext.Provider
      value={{
        publicClient: undefined, // Not used anymore, keeping for compatibility
        walletClient: undefined, // Not used anymore, keeping for compatibility
        userId,
        setUserId: handleSetUserId,
      }}
    >
      {children}
    </FeedbackContext.Provider>
  );
}