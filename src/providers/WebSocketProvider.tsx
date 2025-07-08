"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { consola } from "@/lib/logger";
import { ViemEventManager, ContractEventData } from "@/lib/ViemEventManager";
import { useNetworkConfig } from "@/hooks/contract/useNetworkConfig";

interface WebSocketContextType {
  manager: ViemEventManager | null;
  isConnected: boolean;
  error: unknown;
  contractEvents: ContractEventData[];
}

const EventContext = createContext<WebSocketContextType>({
  manager: null,
  isConnected: false,
  error: null,
  contractEvents: [],
});

type ProviderProps = {
  children: React.ReactNode;
};

export function WebSocketProvider({ children }: Readonly<ProviderProps>) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [contractEvents, setContractEvents] = useState<ContractEventData[]>([]);
  const managerRef = useRef<ViemEventManager | null>(null);
  const isInitializedRef = useRef(false);
  
  const { chain, contract } = useNetworkConfig();

  useEffect(() => {
    // Prevent double initialization in development
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // Create a single Viem event manager instance
    const manager = new ViemEventManager(chain, contract);
    managerRef.current = manager;

    manager.on("connected", () => {
      setIsConnected(true);
      setError(null);
      consola.success("Viem event provider: connected");
    });

    manager.on("error", (err) => {
      setError(err);
      setIsConnected(false);
      consola.error("Viem event provider error:", err);
    });

    manager.on("maxReconnectAttemptsReached", () => {
      setIsConnected(false);
      consola.error("Viem event provider: max reconnection attempts reached");
    });

    manager.on("contractEvent", (event: ContractEventData) => {
      consola.info("Contract event received:", event);
      setContractEvents((prev) => {
        // Check for duplicates based on transaction hash and log index
        const isDuplicate = prev.some(
          (e) =>
            e.transactionHash === event.transactionHash &&
            e.logIndex === event.logIndex
        );

        if (isDuplicate) {
          consola.debug(
            "Duplicate event filtered:",
            event.transactionHash
          );
          return prev;
        }

        // Limit array size to prevent memory issues
        const newEvents = [...prev, event];
        if (newEvents.length > 500) {
          return newEvents.slice(-400); // Keep last 400 events
        }
        return newEvents;
      });
    });

    return () => {
      consola.debug("Viem event provider: cleaning up");
      if (managerRef.current) {
        managerRef.current.disconnect();
        managerRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [chain, contract]);

  const providerValue = useMemo(() => {
    return {
      manager: managerRef.current,
      isConnected,
      error,
      contractEvents,
    };
  }, [contractEvents, error, isConnected]);

  return (
    <EventContext.Provider value={providerValue}>
      {children}
    </EventContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}
