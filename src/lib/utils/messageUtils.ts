import { Message } from '@/hooks/feedback/useTopic';
import { MESSAGE_HISTORY_LIMIT } from '@/constants/feedback';

/**
 * Sort messages by timestamp in ascending order (oldest first)
 */
export const sortMessagesByTimestamp = (messages: Message['items']): Message['items'] => {
  return [...messages].sort((a, b) => a.timestamp - b.timestamp);
};

/**
 * Remove duplicate messages by msgId
 */
export const deduplicateMessages = (messages: Message['items']): Message['items'] => {
  const seen = new Map<number, Message['items'][0]>();
  
  for (const msg of messages) {
    if (msg.msgId !== -1 && !seen.has(msg.msgId)) {
      seen.set(msg.msgId, msg);
    }
  }
  
  return Array.from(seen.values());
};

/**
 * Validate message content
 */
export const validateMessage = (message: string): { valid: boolean; error?: string } => {
  if (!message || !message.trim()) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  
  if (message.length > 500) {
    return { valid: false, error: 'Message is too long (max 500 characters)' };
  }
  
  return { valid: true };
};

/**
 * Format timestamp to readable time
 */
export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Get recent messages with limit
 */
export const getRecentMessages = (
  messages: Message['items'],
  limit = MESSAGE_HISTORY_LIMIT
): Message['items'] => {
  return messages.slice(-limit);
};

/**
 * Check if a message is from a specific user
 */
export const isMessageFromUser = (
  message: Message['items'][0],
  userAddress?: string
): boolean => {
  if (!userAddress) return false;
  return message.user.toLowerCase() === userAddress.toLowerCase();
};

/**
 * Type guard for valid message
 */
export const isValidMessage = (message: unknown): message is Message['items'][0] => {
  return (
    typeof message === 'object' &&
    message !== null &&
    'msgId' in message &&
    'user' in message &&
    'message' in message &&
    'timestamp' in message &&
    'topic' in message
  );
};