import { Message } from "@/hooks/feedback/useTopic";

interface MessageStore {
  messages: Map<string, Message["items"]>;
  seenMsgIds: Map<string, Set<number>>;
}

class GlobalMessageStore {
  private store: MessageStore = {
    messages: new Map(),
    seenMsgIds: new Map(),
  };

  getMessages(topic: string): Message["items"] {
    return this.store.messages.get(topic) || [];
  }

  setMessages(topic: string, messages: Message["items"]) {
    this.store.messages.set(topic, messages);
  }

  addMessage(topic: string, message: Message["items"][0]) {
    const current = this.getMessages(topic);
    const updated = [...current, message];
    this.setMessages(topic, updated);
  }

  getSeenIds(topic: string): Set<number> {
    if (!this.store.seenMsgIds.has(topic)) {
      this.store.seenMsgIds.set(topic, new Set());
    }
    return this.store.seenMsgIds.get(topic)!;
  }

  hasSeenMessage(topic: string, msgId: number): boolean {
    return this.getSeenIds(topic).has(msgId);
  }

  markMessageSeen(topic: string, msgId: number) {
    this.getSeenIds(topic).add(msgId);
  }

  clearTopic(topic: string) {
    this.store.messages.delete(topic);
    this.store.seenMsgIds.delete(topic);
  }
}

// Singleton instance
export const messageStore = new GlobalMessageStore();