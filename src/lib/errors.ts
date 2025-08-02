export class FeedbackError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'FeedbackError';
  }
}

export const ErrorCodes = {
  NO_ACCOUNT: 'NO_ACCOUNT',
  NO_CLIENT: 'NO_CLIENT',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  REGISTRATION_FAILED: 'REGISTRATION_FAILED',
  MESSAGE_SEND_FAILED: 'MESSAGE_SEND_FAILED',
  USER_NOT_REGISTERED: 'USER_NOT_REGISTERED',
  INVALID_INPUT: 'INVALID_INPUT',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export function handleError(error: unknown, defaultMessage: string): FeedbackError {
  if (error instanceof FeedbackError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new FeedbackError(error.message, ErrorCodes.TRANSACTION_FAILED, error);
  }
  
  return new FeedbackError(defaultMessage, ErrorCodes.TRANSACTION_FAILED, error);
}