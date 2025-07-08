import { EventEmitter } from "events";
import { PublicClient, parseAbiItem, Log, createPublicClient, webSocket, Chain } from "viem";
import { consola } from "@/lib/logger";
import { getNetworkConfig } from "@/hooks/contract/useNetworkConfig";

export interface ContractEventData {
  address: string;
  topics: string[];
  data: string;
  transactionHash: string;
  blockNumber: string | null;
  blockHash: string | null;
  eventName?: string;
  args?: unknown;
  decoded: boolean;
  error?: string;
  logIndex?: number;
  timestamp?: Date;
}

export class ViemEventManager extends EventEmitter {
  private unwatchFunctions: (() => void)[] = [];
  private isWatching = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private wsClient: PublicClient;

  constructor(
    private chain: Chain,
    private contractAddress: string
  ) {
    super();
    consola.info("🔧 ViemEventManager initializing for contract:", contractAddress);
    
    const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || "production";
    const { wss } = getNetworkConfig(environment);
    
    // Create WebSocket client for event watching
    this.wsClient = createPublicClient({
      chain,
      transport: webSocket(wss),
    });
    
    this.startWatching();
  }

  private async startWatching() {
    if (this.isWatching) return;
    
    try {
      this.isWatching = true;
      consola.debug("🔍 Starting viem event watchers");

      // Watch for tilesPainted events
      const unwatchTilesPainted = this.wsClient.watchEvent({
        address: this.contractAddress as `0x${string}`,
        event: parseAbiItem("event tilesPainted(uint256[] indices, uint8 r, uint8 g, uint8 b)"),
        onLogs: (logs) => {
          logs.forEach(log => this.handleLog(log, "tilesPainted"));
        },
        onError: (error) => {
          consola.error("Error watching tilesPainted events:", error);
          this.handleWatchError();
        }
      });

      // Watch for canvasWiped events
      const unwatchCanvasWiped = this.wsClient.watchEvent({
        address: this.contractAddress as `0x${string}`,
        event: parseAbiItem("event canvasWiped(address indexed wiper, uint256 timestamp)"),
        onLogs: (logs) => {
          logs.forEach(log => this.handleLog(log, "canvasWiped"));
        },
        onError: (error) => {
          consola.error("Error watching canvasWiped events:", error);
          this.handleWatchError();
        }
      });

      this.unwatchFunctions = [unwatchTilesPainted, unwatchCanvasWiped];
      this.reconnectAttempts = 0;
      
      consola.success("✅ Viem event watchers started successfully");
      this.emit("connected");

    } catch (error) {
      consola.error("Failed to start viem event watchers:", error);
      this.handleWatchError();
    }
  }

  private handleLog(log: Log<bigint, number, false>, eventName?: string) {
    try {
      consola.debug("📨 Received viem event log:", { eventName, log });

      const eventData: ContractEventData = {
        address: log.address,
        topics: log.topics,
        data: log.data,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber?.toString() || null,
        blockHash: log.blockHash || null,
        eventName,
        args: (log as Log & { args?: unknown }).args,
        decoded: true,
        logIndex: log.logIndex || 0,
        timestamp: new Date(),
      };

      consola.info("📨 Emitting contract event:", eventData);
      this.emit("contractEvent", eventData);

    } catch (error) {
      consola.error("Failed to process viem event log:", error);
      
      // Still emit the raw event data
      const rawEventData: ContractEventData = {
        address: log.address,
        topics: log.topics,
        data: log.data,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber?.toString() || null,
        blockHash: log.blockHash || null,
        decoded: false,
        error: error instanceof Error ? error.message : "Unknown error",
        logIndex: log.logIndex || 0,
        timestamp: new Date(),
      };
      
      this.emit("contractEvent", rawEventData);
    }
  }

  private handleWatchError() {
    this.isWatching = false;
    this.stopWatching();
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
      consola.info(`🔄 Reconnecting viem watchers in ${delay}ms...`);
      
      setTimeout(() => {
        this.reconnectAttempts++;
        this.startWatching();
      }, delay);
    } else {
      consola.error("❌ Max reconnection attempts reached for viem watchers");
      this.emit("maxReconnectAttemptsReached");
    }
  }

  private stopWatching() {
    this.unwatchFunctions.forEach(unwatch => {
      try {
        unwatch();
      } catch (error) {
        consola.error("Error stopping viem watcher:", error);
      }
    });
    this.unwatchFunctions = [];
    this.isWatching = false;
  }

  public disconnect() {
    consola.debug("🔌 Disconnecting viem event manager");
    this.stopWatching();
    this.removeAllListeners();
  }

  public isConnected(): boolean {
    return this.isWatching;
  }

  public restart() {
    consola.info("🔄 Restarting viem event manager");
    this.stopWatching();
    this.reconnectAttempts = 0;
    this.startWatching();
  }
}