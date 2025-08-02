export enum ChatErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  USER_NOT_REGISTERED = 'USER_NOT_REGISTERED',
  REGISTRATION_FAILED = 'REGISTRATION_FAILED',
  MESSAGE_TOO_LONG = 'MESSAGE_TOO_LONG',
  INVALID_INPUT = 'INVALID_INPUT',
  NONCE_ERROR = 'NONCE_ERROR',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

export class ChatError extends Error {
  public readonly code: ChatErrorCode;
  public readonly retryable: boolean;
  public readonly details?: unknown;

  constructor(
    code: ChatErrorCode,
    message: string,
    retryable = false,
    details?: unknown
  ) {
    super(message);
    this.name = 'ChatError';
    this.code = code;
    this.retryable = retryable;
    this.details = details;
  }

  static fromError(error: unknown): ChatError {
    if (error instanceof ChatError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);

    // Map common error patterns to specific error codes
    if (message.includes('nonce') || message.includes('replacement')) {
      return new ChatError(
        ChatErrorCode.NONCE_ERROR,
        'Transaction nonce conflict. Please retry.',
        true,
        error
      );
    }

    if (message.includes('network') || message.includes('fetch')) {
      return new ChatError(
        ChatErrorCode.NETWORK_ERROR,
        'Network connection failed. Please check your connection.',
        true,
        error
      );
    }

    if (message.includes('timeout')) {
      return new ChatError(
        ChatErrorCode.TIMEOUT,
        'Operation timed out. Please try again.',
        true,
        error
      );
    }

    if (message.includes('User is not registered')) {
      return new ChatError(
        ChatErrorCode.USER_NOT_REGISTERED,
        'Please register before sending messages.',
        false,
        error
      );
    }

    return new ChatError(
      ChatErrorCode.UNKNOWN,
      message || 'An unexpected error occurred',
      false,
      error
    );
  }
}

export const isRetryableError = (error: unknown): boolean => {
  if (error instanceof ChatError) {
    return error.retryable;
  }
  return false;
};