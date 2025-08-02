import { TransactionReceipt, PublicClient } from 'viem';
import { toast } from 'react-toastify';
import { ChatError, ChatErrorCode } from '../errors/ChatError';

/**
 * Poll for transaction receipt with timeout
 */
export const pollForReceipt = async (
  publicClient: PublicClient,
  txHash: string,
  maxAttempts = 30,
  delayMs = 1000
): Promise<TransactionReceipt | null> => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
      if (receipt) {
        return receipt;
      }
    } catch {
      // Continue polling
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return null;
};

/**
 * Handle transaction response and wait for confirmation
 */
interface TransactionResponse {
  txHash?: string;
}

export const handleTransactionResponse = async (
  response: TransactionResponse,
  publicClient: PublicClient,
  options: {
    successMessage?: string;
    errorMessage?: string;
    showToast?: boolean;
  } = {}
): Promise<TransactionReceipt> => {
  const {
    successMessage = 'Transaction confirmed',
    errorMessage = 'Transaction failed',
    showToast = true,
  } = options;

  if (!response?.txHash) {
    throw new ChatError(
      ChatErrorCode.TRANSACTION_FAILED,
      'No transaction hash returned',
      false
    );
  }

  // Poll for receipt
  const receipt = await pollForReceipt(publicClient, response.txHash);
  
  if (!receipt) {
    throw new ChatError(
      ChatErrorCode.TIMEOUT,
      'Transaction confirmation timeout',
      true
    );
  }

  if (receipt.status === 'reverted') {
    throw new ChatError(
      ChatErrorCode.TRANSACTION_FAILED,
      errorMessage,
      true
    );
  }

  if (showToast) {
    toast.success(successMessage);
  }

  return receipt;
};

/**
 * Check if error is nonce-related
 */
export const isNonceError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('nonce') || message.includes('replacement');
};

/**
 * Extract error message from transaction error
 */
export const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    // Check for common blockchain error patterns
    if (error.message.includes('User denied')) {
      return 'Transaction cancelled by user';
    }
    if (error.message.includes('insufficient funds')) {
      return 'Insufficient funds for transaction';
    }
    return error.message;
  }
  return 'Unknown error occurred';
};