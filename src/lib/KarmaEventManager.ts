import { EventEmitter } from "events";
import { parseAbiItem, decodeEventLog } from "viem";
import { consola } from "@/lib/logger";
import { CHAT_CONTRACT } from "@/constants/feedback";
import type { PublicShredClient } from "shreds/viem";

export interface MessageEventData {
  user: string;
  userId: string;
  message: string;
  msgId: number;
  topic: string;
  timestamp: number;
  transactionHash: string;
}

export class KarmaEventManager extends EventEmitter {
  private unwatch: (() => void) | null = null;
  private isWatching = false;

  constructor(private shredClient: PublicShredClient) {
    super();
    this.startWatching();
  }

  private async startWatching() {
    if (this.isWatching) return;
    
    try {
      this.isWatching = true;
      consola.info("🔧 KarmaEventManager: Starting to watch for MessageSentToTopic events");

      // Watch for MessageSentToTopic events
      const messageSentEvent = parseAbiItem('event MessageSentToTopic(address indexed user, string userId, string message, uint256 msgId, string topic)');
      
      this.unwatch = this.shredClient.watchEvent({
        address: CHAT_CONTRACT as `0x${string}`,
        event: messageSentEvent,
        onLogs: (logs) => {
          console.log("logs received!!!")
          logs.forEach((log) => {
            try {
              const decoded = decodeEventLog({
                abi: [messageSentEvent],
                data: log.data,
                topics: log.topics,
              });

              if (decoded.eventName === 'MessageSentToTopic') {
                const args = decoded.args as {
                  user: string;
                  userId: string;
                  message: string;
                  msgId: bigint;
                  topic: string;
                };

                const messageEvent: MessageEventData = {
                  user: args.user,
                  userId: args.userId,
                  message: args.message,
                  msgId: Number(args.msgId),
                  topic: args.topic,
                  timestamp: Math.floor(Date.now() / 1000),
                  transactionHash: log.transactionHash || '',
                };

                consola.info("📨 KarmaEventManager: New message event", messageEvent);
                this.emit('message', messageEvent);
              }
            } catch (error) {
              consola.error("KarmaEventManager: Error decoding event", error);
            }
          });
        },
        onError: (error) => {
          consola.error("KarmaEventManager: WebSocket error", error);
          this.emit('error', error);
        },
      });

      this.emit('connected');
      consola.success("KarmaEventManager: Connected and watching for events");
    } catch (error) {
      this.isWatching = false;
      consola.error("KarmaEventManager: Failed to start watching", error);
      this.emit('error', error);
    }
  }

  disconnect() {
    if (this.unwatch) {
      this.unwatch();
      this.unwatch = null;
    }
    this.isWatching = false;
    this.removeAllListeners();
    consola.info("KarmaEventManager: Disconnected");
  }
}