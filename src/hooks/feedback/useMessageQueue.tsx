import { useState, useCallback, useRef } from "react";
import { SendMessageParams } from "@/types/feedback";
import { useFeedback } from "./useFeedback";

interface QueuedMessage extends SendMessageParams {
  id: string;
  retries: number;
}

interface MessageQueueState {
  queue: QueuedMessage[];
  processing: boolean;
  currentMessageId: string | null;
}

export function useMessageQueue() {
  const { sendMessage } = useFeedback();
  const [state, setState] = useState<MessageQueueState>({
    queue: [],
    processing: false,
    currentMessageId: null,
  });
  
  const processingRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (processingRef.current || state.queue.length === 0) {
      return;
    }

    processingRef.current = true;
    setState(prev => ({ ...prev, processing: true }));

    const [message, ...rest] = state.queue;
    setState(prev => ({ 
      ...prev, 
      queue: rest, 
      currentMessageId: message.id 
    }));

    try {
      await sendMessage(message);
      
      setState(prev => ({ 
        ...prev, 
        currentMessageId: null 
      }));
    } catch (error) {
      console.error("[MessageQueue] Failed to send message:", error);
      
      // Retry logic
      if (message.retries < 3) {
        setState(prev => ({
          ...prev,
          queue: [...prev.queue, { ...message, retries: message.retries + 1 }],
          currentMessageId: null
        }));
      }
    } finally {
      processingRef.current = false;
      setState(prev => ({ ...prev, processing: false }));
      
      // Process next message if any
      if (state.queue.length > 0) {
        setTimeout(processQueue, 100);
      }
    }
  }, [state.queue, sendMessage]);

  const addToQueue = useCallback((params: SendMessageParams): string => {
    const id = `msg-${Date.now()}-${Math.random()}`;
    const queuedMessage: QueuedMessage = {
      ...params,
      id,
      retries: 0,
    };

    setState(prev => ({
      ...prev,
      queue: [...prev.queue, queuedMessage]
    }));

    // Start processing if not already processing
    if (!processingRef.current) {
      setTimeout(processQueue, 0);
    }

    return id;
  }, [processQueue]);

  const removeFromQueue = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      queue: prev.queue.filter(msg => msg.id !== id)
    }));
  }, []);

  return {
    addToQueue,
    removeFromQueue,
    isProcessing: state.processing,
    currentMessageId: state.currentMessageId,
    queueLength: state.queue.length,
  };
}