import { useEffect, useState, useMemo } from "react";
import { useTopic, Message } from "./useTopic";
import { useWallet } from "../contract/useWallet";
import { MessageEventData } from "@/lib/KarmaEventManager";
import { KarmaEventManagerSingleton } from "@/lib/KarmaEventManagerSingleton";
import { messageStore } from "@/lib/messageStore";

interface PendingMessage {
  tempId: string;
  message: string;
  timestamp: number;
}

export function useRealtimeMessages(topicName: string) {
  const { account, shredClient } = useWallet();
  const fullTopicName = `channel_${topicName}`;
  
  // Initial load from GraphQL (with longer poll interval since we use websockets)
  const { data: topic, loading, error } = useTopic({
    name: fullTopicName,
    pollInterval: 30000, // 30 seconds - just for backup/sync
  });

  // Track pending messages
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  
  // Combined messages (GraphQL + WebSocket + Pending)
  const [realtimeMessages, setRealtimeMessages] = useState<Message["items"]>(() => {
    // Initialize from global store
    return messageStore.getMessages(fullTopicName);
  });

  // Initialize seen message IDs from GraphQL data
  useEffect(() => {
    if (topic?.messages?.items) {
      const historicMessages = topic.messages.items;
      const existingMessages = messageStore.getMessages(fullTopicName);
      
      // Mark historic messages as seen
      historicMessages.forEach(msg => {
        messageStore.markMessageSeen(fullTopicName, msg.msgId);
      });
      
      // Merge historic messages with existing realtime messages
      const mergedMessages = [...historicMessages];
      
      // Add any realtime messages that aren't in the historic set
      existingMessages.forEach(msg => {
        if (!historicMessages.find(h => h.msgId === msg.msgId)) {
          mergedMessages.push(msg);
        }
      });
      
      // Sort by timestamp
      mergedMessages.sort((a, b) => a.timestamp - b.timestamp);
      
      // Update both local state and global store
      setRealtimeMessages(mergedMessages);
      messageStore.setMessages(fullTopicName, mergedMessages);
    }
  }, [topic?.messages?.items, fullTopicName]);

  // Get KarmaEventManager singleton
  const karmaEventManager = useMemo(() => {
    if (!shredClient) return null;
    return KarmaEventManagerSingleton.getInstance(shredClient);
  }, [shredClient]);

  // Process WebSocket events from KarmaEventManager
  useEffect(() => {
    if (!karmaEventManager) return;

    const handleMessage = (event: MessageEventData) => {
      // Check if this message is for our topic
      if (event.topic !== fullTopicName) return;
      
      // Skip if we've already seen this message
      if (messageStore.hasSeenMessage(fullTopicName, event.msgId)) return;
      
      console.log("[RealtimeMessages] New message from WebSocket:", event);

      // Add to seen messages
      messageStore.markMessageSeen(fullTopicName, event.msgId);

      // Add to realtime messages
      const newMessage = {
        msgId: event.msgId,
        user: event.user,
        userId: event.userId,
        message: event.message,
        topic: event.topic,
        timestamp: event.timestamp,
      };

      // Update both local state and global store
      setRealtimeMessages(prev => {
        const updated = [...prev, newMessage];
        messageStore.setMessages(fullTopicName, updated);
        return updated;
      });

      // Remove from pending if it's from the current user
      if (event.user.toLowerCase() === account?.address?.toLowerCase()) {
        setPendingMessages(prev => 
          prev.filter(pending => pending.message !== event.message)
        );
      }
    };

    karmaEventManager.on('message', handleMessage);

    return () => {
      karmaEventManager.off('message', handleMessage);
    };
  }, [karmaEventManager, fullTopicName, account?.address]);

  // Add a pending message
  const addPendingMessage = (message: string) => {
    const pending: PendingMessage = {
      tempId: `pending-${Date.now()}`,
      message,
      timestamp: Math.floor(Date.now() / 1000),
    };
    setPendingMessages(prev => [...prev, pending]);
    return pending.tempId;
  };

  // Remove a pending message (on error)
  const removePendingMessage = (tempId: string) => {
    setPendingMessages(prev => prev.filter(p => p.tempId !== tempId));
  };

  // Combine all messages
  const allMessages = useMemo(() => {
    const messages = [...realtimeMessages];
    
    // Add pending messages at the end
    pendingMessages.forEach(pending => {
      messages.push({
        msgId: -1, // Temporary ID
        message: pending.message,
        user: account?.address || '',
        userId: '', // Will be filled when confirmed
        topic: `channel_${topicName}`,
        timestamp: pending.timestamp,
      });
    });

    return messages;
  }, [realtimeMessages, pendingMessages, account?.address, topicName]);

  return {
    messages: allMessages,
    loading,
    error,
    addPendingMessage,
    removePendingMessage,
    pendingCount: pendingMessages.length,
  };
}