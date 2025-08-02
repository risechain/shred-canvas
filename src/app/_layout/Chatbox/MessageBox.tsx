import { Button, Input, Separator } from "@/components/ui";
import { useFeedback } from "@/hooks/feedback/useFeedback";
import { useRealtimeMessages } from "@/hooks/feedback/useRealtimeMessages";
import { useUserRegistration } from "@/hooks/feedback/useUserRegistration";
import { cn } from "@/lib/utils";
import { SendIcon, X } from "lucide-react";
import { useRef, useEffect } from "react";
import { useWallet } from "@/hooks/contract/useWallet";
import { useMessageBoxState } from "@/hooks/feedback/useMessageBoxState";
import { TOPIC_PREFIX, SCROLL_DELAY, INITIAL_SCROLL_DELAY } from "@/constants/feedback";

interface MessageBoxProps {
  onClose?: () => void;
}

export function MessageBox({ onClose }: MessageBoxProps) {
  const topicName = "General"; // Hardcoded to General channel
  const displayName = "Onchain TrollBox"; // Display name for the UI
  
  const { account } = useWallet();
  const { sendMessage } = useFeedback();
  const { 
    ensureRegistered,
    userId
  } = useUserRegistration();
  
  const { 
    messages, 
    loading, 
    addPendingMessage, 
    removePendingMessage 
  } = useRealtimeMessages(topicName);

  const {
    inputMessage,
    currentPendingId,
    setInputMessage,
    setPendingId,
    clearInput
  } = useMessageBoxState();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  async function onSendMessage(messageToSend?: string) {
    const message = messageToSend || inputMessage;
    
    if (!message || !message.trim()) {
      return;
    }
    
    // Check if user is registered first
    const canSend = await ensureRegistered();
    
    if (!canSend) {
      // Remove pending message since registration was cancelled or failed
      if (currentPendingId) {
        removePendingMessage(currentPendingId);
        setPendingId(null);
      }
      // Restore the input
      setInputMessage(message);
      return;
    }
    
    const topicToSend = `${TOPIC_PREFIX}${topicName}`;
    
    // Add pending message immediately
    const pendingId = addPendingMessage(message);
    setPendingId(pendingId);
    
    // Clear input immediately
    clearInput();
    
    // Scroll to bottom after adding pending message
    setTimeout(scrollToBottom, SCROLL_DELAY);
    
    try {
      await sendMessage({
        message: message,
        topicName: topicToSend,
      });
      // Pending message will be removed when websocket event is received
      setPendingId(null);
    } catch {
      // Remove pending message on error
      removePendingMessage(pendingId);
      setPendingId(null);
      // Restore the input
      setInputMessage(message);
    }
  }

  function getTimestamp(timestamp: number) {
    return new Date(timestamp * 1000).toLocaleTimeString();
  }

  const scrollToBottom = (instant = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: instant ? "instant" : "smooth" });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Scroll to bottom on initial load (instant, no animation)
  useEffect(() => {
    if (!loading && messages.length > 0) {
      // Small delay to ensure DOM is updated, but scroll instantly
      setTimeout(() => scrollToBottom(true), INITIAL_SCROLL_DELAY);
    }
  }, [loading, messages.length]);


  return (
    <div className="p-3 md:w-80 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 items-center">
          <p className="font-bold pr-1">{displayName}</p>
          {userId && (
            <p className="text-xs text-muted-foreground">({userId})</p>
          )}
        </div>
        {onClose && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 rounded-full"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Separator />
      <div 
        ref={messagesContainerRef}
        className="bg-accent/50 min-h-20 rounded-sm py-4 px-2 grid gap-1 max-h-80 overflow-auto"
      >
        {loading && messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center">Loading messages...</p>
        ) : (
          messages.map((item, index) => {
            const isUserSender =
              item.user.toLowerCase() === account?.address?.toLowerCase();
            const isPending = item.msgId === -1;

            return (
              <div
                key={isPending ? `pending-${index}` : item.msgId}
                data-ismessagesender={isUserSender}
                className={cn(
                  "bg-primary px-2 py-1 rounded-sm max-w-[75%]",
                  "data-[ismessagesender=true]:place-self-end",
                  "data-[ismessagesender=false]:bg-secondary/10",
                  isPending && "opacity-70"
                )}
              >
                {!isUserSender && (
                  <div className="flex gap-2 items-center">
                    <p className="text-xs text-text-secondary">{item.userId}</p>
                    <Separator
                      orientation="vertical"
                      className="min-h-3 bg-foreground/25"
                    />
                    <p className="text-xs text-text-secondary">
                      {getTimestamp(item.timestamp)}
                    </p>
                  </div>
                )}
                <p
                  data-ismessagesender={isUserSender}
                  className="text-sm text-invert data-[ismessagesender=false]:text-foreground"
                >
                  {item.message}
                </p>
                {isPending && isUserSender && (
                  <p className="text-xs text-invert/70 text-end mt-1">sending...</p>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2 rounded-sm border border-border-primary overflow-hidden">
        <Input
          className="border"
          value={inputMessage}
          onChange={(event) => {
            const value = event.target.value;
            setInputMessage(value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !currentPendingId && inputMessage.trim()) {
              onSendMessage();
            }
          }}
        />
        <Button
          className="rounded-none"
          variant="default"
          disabled={!inputMessage || !!currentPendingId}
          onClick={() => onSendMessage()}
        >
          <SendIcon className="stroke-invert" />
        </Button>
      </div>
    </div>
  );
}