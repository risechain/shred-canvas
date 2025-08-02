import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Message } from '@/hooks/feedback/useTopic';

interface PendingMessage {
  tempId: string;
  message: string;
  timestamp: number;
  topicName: string;
}

interface ChatState {
  // Message state
  messages: Map<string, Message['items']>; // topic -> messages
  pendingMessages: Map<string, PendingMessage[]>; // topic -> pending messages
  seenMessageIds: Map<string, Set<number>>; // topic -> seen message IDs
  
  // User state
  userId: string | null;
  isRegistered: boolean;
  registrationLoading: boolean;
  
  // UI state
  inputMessages: Map<string, string>; // topic -> input text
  scrollToBottom: Map<string, boolean>; // topic -> should scroll
  
  // Loading states
  loadingStates: {
    messages: boolean;
    sending: boolean;
    registering: boolean;
  };
  
  // Actions
  setMessages: (topic: string, messages: Message['items']) => void;
  addMessage: (topic: string, message: Message['items'][0]) => void;
  
  addPendingMessage: (topic: string, message: string) => string;
  removePendingMessage: (topic: string, tempId: string) => void;
  
  markMessageSeen: (topic: string, msgId: number) => void;
  hasSeenMessage: (topic: string, msgId: number) => boolean;
  
  setUserId: (userId: string | null) => void;
  setIsRegistered: (isRegistered: boolean) => void;
  
  setInputMessage: (topic: string, message: string) => void;
  getInputMessage: (topic: string) => string;
  clearInputMessage: (topic: string) => void;
  
  setShouldScrollToBottom: (topic: string, shouldScroll: boolean) => void;
  
  setLoadingState: (key: keyof ChatState['loadingStates'], value: boolean) => void;
  
  // Computed getters
  getMessages: (topic: string) => Message['items'];
  getPendingMessages: (topic: string) => PendingMessage[];
  getCombinedMessages: (topic: string, userAddress?: string) => Message['items'];
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set, get) => ({
      // Initial state
      messages: new Map(),
      pendingMessages: new Map(),
      seenMessageIds: new Map(),
      userId: null,
      isRegistered: false,
      registrationLoading: false,
      inputMessages: new Map(),
      scrollToBottom: new Map(),
      loadingStates: {
        messages: false,
        sending: false,
        registering: false,
      },

      // Message actions
      setMessages: (topic, messages) => {
        set((state) => {
          const newMessages = new Map(state.messages);
          newMessages.set(topic, messages);
          return { messages: newMessages };
        });
      },

      addMessage: (topic, message) => {
        set((state) => {
          const newMessages = new Map(state.messages);
          const topicMessages = newMessages.get(topic) || [];
          newMessages.set(topic, [...topicMessages, message]);
          return { messages: newMessages };
        });
      },

      // Pending message actions
      addPendingMessage: (topic, message) => {
        const tempId = `pending-${Date.now()}-${Math.random()}`;
        const pending: PendingMessage = {
          tempId,
          message,
          timestamp: Math.floor(Date.now() / 1000),
          topicName: topic,
        };

        set((state) => {
          const newPending = new Map(state.pendingMessages);
          const topicPending = newPending.get(topic) || [];
          newPending.set(topic, [...topicPending, pending]);
          return { pendingMessages: newPending };
        });

        return tempId;
      },

      removePendingMessage: (topic, tempId) => {
        set((state) => {
          const newPending = new Map(state.pendingMessages);
          const topicPending = newPending.get(topic) || [];
          newPending.set(topic, topicPending.filter(p => p.tempId !== tempId));
          return { pendingMessages: newPending };
        });
      },

      // Seen message tracking
      markMessageSeen: (topic, msgId) => {
        set((state) => {
          const newSeen = new Map(state.seenMessageIds);
          const topicSeen = newSeen.get(topic) || new Set();
          topicSeen.add(msgId);
          newSeen.set(topic, topicSeen);
          return { seenMessageIds: newSeen };
        });
      },

      hasSeenMessage: (topic, msgId) => {
        const state = get();
        const topicSeen = state.seenMessageIds.get(topic);
        return topicSeen ? topicSeen.has(msgId) : false;
      },

      // User actions
      setUserId: (userId) => set({ userId }),
      setIsRegistered: (isRegistered) => set({ isRegistered }),

      // Input actions
      setInputMessage: (topic, message) => {
        set((state) => {
          const newInputs = new Map(state.inputMessages);
          newInputs.set(topic, message);
          return { inputMessages: newInputs };
        });
      },

      getInputMessage: (topic) => {
        const state = get();
        return state.inputMessages.get(topic) || '';
      },

      clearInputMessage: (topic) => {
        set((state) => {
          const newInputs = new Map(state.inputMessages);
          newInputs.delete(topic);
          return { inputMessages: newInputs };
        });
      },

      // UI actions
      setShouldScrollToBottom: (topic, shouldScroll) => {
        set((state) => {
          const newScroll = new Map(state.scrollToBottom);
          newScroll.set(topic, shouldScroll);
          return { scrollToBottom: newScroll };
        });
      },

      // Loading actions
      setLoadingState: (key, value) => {
        set((state) => ({
          loadingStates: {
            ...state.loadingStates,
            [key]: value,
          },
        }));
      },

      // Getters
      getMessages: (topic) => {
        const state = get();
        return state.messages.get(topic) || [];
      },

      getPendingMessages: (topic) => {
        const state = get();
        return state.pendingMessages.get(topic) || [];
      },

      getCombinedMessages: (topic, userAddress) => {
        const state = get();
        const messages = state.getMessages(topic);
        const pending = state.getPendingMessages(topic);

        // Convert pending messages to Message format
        const pendingAsMessages: Message['items'] = pending.map(p => ({
          msgId: -1,
          message: p.message,
          user: userAddress || '',
          userId: state.userId || '',
          topic: p.topicName,
          timestamp: p.timestamp,
        }));

        return [...messages, ...pendingAsMessages];
      },
    }),
    {
      name: 'chat-store',
    }
  )
);