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
import { RiseWebSocketManager } from "@/lib/RiseWebSocketManager";
import { ContractEvent } from "@/lib/types/contracts";

interface WebSocketContextType {
  manager: RiseWebSocketManager | null;
  isConnected: boolean;
  error: unknown;
  contractEvents: ContractEvent[];
}

const WebSocketContext = createContext<WebSocketContextType>({
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
  const [contractEvents, setContractEvents] = useState<ContractEvent[]>([]);
  const managerRef = useRef<RiseWebSocketManager | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization in development
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // Create a single WebSocket manager instance
    const manager = new RiseWebSocketManager();
    managerRef.current = manager;

    manager.on("connected", () => {
      setIsConnected(true);
      setError(null);
      consola.success("WebSocket provider: connected");
    });

    manager.on("disconnected", () => {
      setIsConnected(false);
      consola.warn("WebSocket provider: disconnected");
    });

    manager.on("error", (err) => {
      setError(err);
      consola.error("WebSocket provider error:", err);
    });

    manager.on("subscribed", (subscriptionId) => {
      consola.info("WebSocket provider: subscribed with ID:", subscriptionId);
    });

    manager.on("contractEvent", (event) => {
      consola.info("Contract event received:", event);
      setContractEvents((prev) => {
        // Add timestamp if not present
        const eventWithTimestamp = {
          ...event,
          timestamp: event.timestamp || new Date(),
          logIndex: event.logIndex || 0, // Ensure logIndex exists
        };

        // Check for duplicates based on transaction hash and log index
        const isDuplicate = prev.some(
          (e) =>
            e.transactionHash === eventWithTimestamp.transactionHash &&
            e.logIndex === eventWithTimestamp.logIndex
        );

        if (isDuplicate) {
          consola.debug(
            "Duplicate event filtered:",
            eventWithTimestamp.transactionHash
          );
          return prev;
        }

        // Limit array size to prevent memory issues
        const newEvents = [...prev, eventWithTimestamp];
        if (newEvents.length > 500) {
          return newEvents.slice(-400); // Keep last 400 events
        }
        return newEvents;
      });
    });

    manager.on("reconnected", () => {
      consola.success("WebSocket reconnected - contract events will resume");
    });

    return () => {
      consola.debug("WebSocket provider: cleaning up");
      if (managerRef.current) {
        managerRef.current.disconnect();
        managerRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, []);

  const providerValue = useMemo(() => {
    return {
      manager: managerRef.current,
      isConnected,
      error,
      contractEvents,
    };
  }, [contractEvents, error, isConnected]);

  return (
    <WebSocketContext.Provider value={providerValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}
