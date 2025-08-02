import { Address } from "viem";

// Contract addresses
export const CHAT_CONTRACT: Address = "0x4cbe5874ed2fbe054d24a02366d330cb2bcf8dbf";

// Topic prefixes
export const TOPIC_PREFIX = "channel_";

// Gas settings
export const DEFAULT_GAS = 300000n;
export const GAS_PRICE = BigInt(100);

// Cache settings
export const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Message settings  
export const MAX_MESSAGE_RETRIES = 3;
export const MESSAGE_QUEUE_DELAY = 100; // ms
export const MESSAGE_HISTORY_LIMIT = 20;

// UI settings
export const SCROLL_DELAY = 50; // ms
export const INITIAL_SCROLL_DELAY = 100; // ms