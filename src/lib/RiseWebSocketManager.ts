import { EventEmitter } from "events";
import { Interface, id as ethersId } from "ethers";
import { consola } from "@/lib/logger";
import canvasAbi from "../../abi/canvasAbi.json";
import { getNetworkConfig } from "@/hooks/contract/useNetworkConfig";

export interface Subscription {
  id: string;
  requestId: number;
  type: "logs";
  params: unknown[];
  callback: (data: unknown) => void;
}

export interface LogEvent {
  address: string;
  topics: string[];
  data: string;
  transactionHash: string;
  blockNumber: string | null;
  blockHash: string | null;
}

const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || "production";

const { wss: RISE_WS_URL, contract: CANVAS_ADDRESS } =
  getNetworkConfig(ENVIRONMENT);

export class RiseWebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, Subscription>();
  private pendingSubscriptions = new Map<number, Subscription>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private messageQueue: unknown[] = [];
  private currentId = 1;
  private contractInterface: Interface;

  constructor(private url: string = RISE_WS_URL) {
    super();
    consola.info("🔧 RiseWebSocketManager initializing with URL:", url);
    this.contractInterface = new Interface(canvasAbi);
    this.connect();
  }

  private connect() {
    if (
      this.isConnecting ||
      (this.ws && this.ws.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    this.isConnecting = true;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        consola.success("🟢 WebSocket connected to RISE");
        const wasReconnecting = this.reconnectAttempts > 0;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit("connected");

        // Process queued messages
        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift();
          this.ws?.send(JSON.stringify(message));
        }

        // Subscribe to Canvas contract by default
        this.subscribeToContract(CANVAS_ADDRESS);
        
        // Emit reconnection event for components to re-establish their listeners
        if (wasReconnecting) {
          this.emit("reconnected");
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        consola.warn("🔴 WebSocket disconnected");
        consola.debug("Close code:", event.code);
        consola.debug("Close reason:", event.reason || "No reason provided");
        consola.debug("Was clean:", event.wasClean);
        this.isConnecting = false;
        this.emit("disconnected", { code: event.code, reason: event.reason });
        this.handleDisconnect();
      };

      this.ws.onerror = () => {
        consola.error("❌ WebSocket error occurred");
        this.isConnecting = false;
        // Don't emit error events for connection issues, let onclose handle it
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          consola.error("Failed to parse WebSocket message:", error);
        }
      };
    } catch (error) {
      consola.error("Failed to create WebSocket:", error);
      consola.error("WebSocket URL:", this.url);
      this.isConnecting = false;
      this.handleDisconnect();
    }
  }

  private handleMessage(message: {
    id?: number;
    result?: string;
    method?: string;
    params?: { subscription: string; result: LogEvent };
    error?: unknown;
  }) {
    // Initial subscription response - contains the subscription ID
    if (
      message.id &&
      message.result &&
      this.pendingSubscriptions.has(message.id)
    ) {
      const pendingSub = this.pendingSubscriptions.get(message.id);
      if (pendingSub) {
        const subscriptionId = message.result;
        consola.success("✅ Subscription confirmed - ID:", subscriptionId);

        // Move from pending to active subscriptions
        this.pendingSubscriptions.delete(message.id);
        this.subscriptions.set(subscriptionId, pendingSub);

        this.emit("subscribed", subscriptionId);
      }
      return;
    }

    // Event notification from subscription
    if (message.method === "rise_subscription" && message.params) {
      const { subscription, result } = message.params;
      consola.debug("📨 Received subscription event:", { subscription, result });
      const sub = this.subscriptions.get(subscription);

      if (sub && result) {
        consola.debug("📨 Processing event with subscription:", subscription);
        // Decode the event
        try {
          const decodedEvent = this.decodeEvent(result);
          consola.info("📨 Decoded event:", decodedEvent);
          sub.callback(decodedEvent);
        } catch (error) {
          consola.error("Failed to decode event:", error);
          // Still pass the raw event to the callback
          sub.callback({
            ...result,
            decoded: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      } else {
        consola.warn("📨 No subscription found or no result:", { hasSubscription: !!sub, hasResult: !!result });
      }
      return;
    }

    // Error response
    if (message.error) {
      consola.error("WebSocket error response:", message.error);
      this.emit("error", message.error);

      // Remove pending subscription if it failed
      if (message.id && this.pendingSubscriptions.has(message.id)) {
        this.pendingSubscriptions.delete(message.id);
      }
    }
  }

  private decodeEvent(log: LogEvent): {
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
  } {
    try {
      // Parse the log using the contract interface
      const parsedLog = this.contractInterface.parseLog({
        topics: log.topics,
        data: log.data,
      });

      if (!parsedLog) {
        throw new Error("Failed to parse log");
      }

      return {
        ...log,
        eventName: parsedLog.name,
        args: parsedLog.args,
        decoded: true,
      };
    } catch (error) {
      // Return raw log if decoding fails
      return {
        ...log,
        decoded: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private handleDisconnect() {
    // Clear active subscriptions
    this.subscriptions.clear();
    this.pendingSubscriptions.clear();
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
      consola.info(`🔄 Reconnecting in ${delay}ms...`);

      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, delay);
    } else {
      consola.error("❌ Max reconnection attempts reached");
      this.emit("maxReconnectAttemptsReached");
    }
  }

  private sendMessage(message: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(message);
    }
  }

  public subscribeToContract(address: string): void {
    // Create subscription with just the contract address
    const requestId = this.currentId++;

    const params = [
      "logs",
      {
        address: address,
      },
    ];

    const subscription: Subscription = {
      id: "", // Will be filled when we get the response
      requestId: requestId,
      type: "logs",
      params,
      callback: (event) => this.emit("contractEvent", event),
    };

    // Store as pending until we get the subscription ID
    this.pendingSubscriptions.set(requestId, subscription);

    const request = {
      jsonrpc: "2.0",
      id: requestId,
      method: "rise_subscribe",
      params,
    };

    consola.debug("📤 Sending subscription request:", request);
    this.sendMessage(request);
  }

  public subscribeToLogs(
    address: string | string[],
    topics?: string[],
    callback?: (event: unknown) => void
  ): string {
    const requestId = this.currentId++;

    const filterParams: { address: string | string[]; topics?: string[] } = {
      address: address,
    };

    if (topics && topics.length > 0) {
      filterParams.topics = topics;
    }

    const params = ["logs", filterParams];

    const subscription: Subscription = {
      id: "", // Will be filled when we get the response
      requestId: requestId,
      type: "logs",
      params,
      callback: callback || ((event) => this.emit("event", event)),
    };

    // Store as pending until we get the subscription ID
    this.pendingSubscriptions.set(requestId, subscription);

    const request = {
      jsonrpc: "2.0",
      id: requestId,
      method: "rise_subscribe",
      params,
    };

    this.sendMessage(request);

    // Return the request ID for now
    return requestId.toString();
  }

  public unsubscribe(subscriptionId: string) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    this.subscriptions.delete(subscriptionId);

    const request = {
      jsonrpc: "2.0",
      id: this.currentId++,
      method: "rise_unsubscribe",
      params: [subscriptionId],
    };

    this.sendMessage(request);
  }

  public disconnect() {
    this.subscriptions.clear();
    this.pendingSubscriptions.clear();
    this.messageQueue = [];
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  // Helper method to compute event topic signatures
  public static computeEventTopic(eventSignature: string): string {
    return ethersId(eventSignature);
  }

  // Get all event signatures from the ABI
  public getEventSignatures(): Record<string, string> {
    const events: Record<string, string> = {};

    for (const item of canvasAbi) {
      if (item.type === "event" && item.name) {
        const inputs = item.inputs.map((input) => input.type).join(",");
        const signature = `${item.name}(${inputs})`;
        events[item.name] = RiseWebSocketManager.computeEventTopic(signature);
      }
    }

    return events;
  }

}
