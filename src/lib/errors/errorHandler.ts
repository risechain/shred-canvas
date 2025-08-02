import { toast } from 'react-toastify';
import { ChatError, ChatErrorCode } from './ChatError';

interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
}

export class ErrorHandler {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

  static handle(error: unknown, options: ErrorHandlerOptions = {}): ChatError {
    const {
      showToast = true,
      logError = true,
      fallbackMessage = 'An unexpected error occurred'
    } = options;

    const chatError = ChatError.fromError(error);

    if (logError) {
      console.error('[ChatError]', {
        code: chatError.code,
        message: chatError.message,
        retryable: chatError.retryable,
        details: chatError.details,
        stack: chatError.stack
      });
    }

    if (showToast) {
      const toastMessage = this.getToastMessage(chatError, fallbackMessage);
      toast.error(toastMessage);
    }

    return chatError;
  }

  static async retry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      onRetry?: (attempt: number, error: ChatError) => void;
      shouldRetry?: (error: ChatError) => boolean;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = this.MAX_RETRIES,
      onRetry,
      shouldRetry = (error) => error.retryable
    } = options;

    let lastError: ChatError | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = ChatError.fromError(error);

        if (!shouldRetry(lastError) || attempt === maxRetries - 1) {
          throw lastError;
        }

        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }

        // Wait before retrying with exponential backoff
        const delay = this.RETRY_DELAYS[attempt] || this.RETRY_DELAYS[this.RETRY_DELAYS.length - 1];
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new ChatError(ChatErrorCode.UNKNOWN, 'Max retries exceeded');
  }

  private static getToastMessage(error: ChatError, fallback: string): string {
    const errorMessages: Record<ChatErrorCode, string> = {
      [ChatErrorCode.NETWORK_ERROR]: 'Network connection failed. Please check your connection.',
      [ChatErrorCode.TRANSACTION_FAILED]: 'Transaction failed. Please try again.',
      [ChatErrorCode.USER_NOT_REGISTERED]: 'Please register with a username first.',
      [ChatErrorCode.REGISTRATION_FAILED]: 'Registration failed. Please try again.',
      [ChatErrorCode.MESSAGE_TOO_LONG]: 'Message is too long. Please shorten it.',
      [ChatErrorCode.INVALID_INPUT]: 'Invalid input. Please check and try again.',
      [ChatErrorCode.NONCE_ERROR]: 'Transaction conflict. Retrying...',
      [ChatErrorCode.TIMEOUT]: 'Operation timed out. Please try again.',
      [ChatErrorCode.UNKNOWN]: fallback
    };

    return errorMessages[error.code] || error.message || fallback;
  }
}

// Convenience functions
export const handleError = ErrorHandler.handle.bind(ErrorHandler);
export const retryWithBackoff = ErrorHandler.retry.bind(ErrorHandler);