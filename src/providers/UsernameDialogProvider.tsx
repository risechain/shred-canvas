"use client";

import { createContext, ReactNode, useContext, useState, useCallback } from "react";
import { UsernameDialog } from "@/app/_layout/Chatbox/UsernameDialog";

interface UsernameDialogContextValue {
  showDialog: (onSubmit: (username: string) => Promise<boolean | undefined>) => void;
  hideDialog: () => void;
}

const UsernameDialogContext = createContext<UsernameDialogContextValue | null>(null);

export function useUsernameDialog() {
  const context = useContext(UsernameDialogContext);
  if (!context) {
    throw new Error("useUsernameDialog must be used within UsernameDialogProvider");
  }
  return context;
}

interface UsernameDialogProviderProps {
  children: ReactNode;
}

export function UsernameDialogProvider({ children }: UsernameDialogProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [onSubmitCallback, setOnSubmitCallback] = useState<((username: string) => Promise<boolean | undefined>) | null>(null);

  const showDialog = useCallback((onSubmit: (username: string) => Promise<boolean | undefined>) => {
    setOnSubmitCallback(() => onSubmit);
    setIsOpen(true);
  }, []);

  const hideDialog = useCallback(() => {
    setIsOpen(false);
    setOnSubmitCallback(null);
  }, []);

  const handleSubmit = async (username: string) => {
    if (onSubmitCallback) {
      const success = await onSubmitCallback(username);
      if (success) {
        hideDialog();
      }
      return success;
    }
    return false;
  };

  return (
    <UsernameDialogContext.Provider value={{ showDialog, hideDialog }}>
      {children}
      <UsernameDialog 
        isOpen={isOpen} 
        onSubmit={handleSubmit}
      />
    </UsernameDialogContext.Provider>
  );
}