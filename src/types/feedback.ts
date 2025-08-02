import { Address } from "viem";

export interface FeedbackMessage {
  msgId: number;
  user: string;
  userId: string;
  message: string;
  topic: string;
  timestamp: number;
}

export interface SendMessageParams {
  message: string;
  topicName: string;
}

export interface TransactionData {
  functionName: string;
  args: readonly unknown[];
}

export interface RegistrationCacheEntry {
  isRegistered: boolean;
  userId?: string;
}

export interface TransactionReceipt {
  blockHash: string;
  blockNumber: bigint;
  contractAddress: string | null;
  cumulativeGasUsed: bigint;
  effectiveGasPrice: bigint;
  from: Address;
  gasUsed: bigint;
  logs: unknown[];
  logsBloom: string;
  status: "success" | "reverted";
  to: Address | null;
  transactionHash: string;
  transactionIndex: number;
  type: string;
}