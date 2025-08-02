import { Address, encodeFunctionData } from "viem";
import { useFeedbackContext } from "../useFeedbackContext";
import { useNetworkConfig } from "../contract/useNetworkConfig";
import { useWallet } from "../contract/useWallet";
import { useNonceManager } from "../useNonceManager";
import { toast } from "react-toastify";
import { ToastMessage } from "../../components/ToastMessage";
import { 
  SendMessageParams, 
  TransactionData, 
  TransactionReceipt 
} from "@/types/feedback";
import { FeedbackError, ErrorCodes, handleError } from "@/lib/errors";
import { registrationCache } from "@/lib/RegistrationCache";
import { CHAT_CONTRACT, DEFAULT_GAS, GAS_PRICE } from "@/constants/feedback";

import karmaAbi from "../../contracts/abi/karma.json";

// Removed unused types

export function useFeedback() {
  const { account, syncClient, publicClient } = useWallet();
  const { chain } = useNetworkConfig();
  const { setUserId } = useFeedbackContext();
  const { getNextNonce } = useNonceManager(account?.address, publicClient);

  async function sendTransaction({ functionName, args }: TransactionData): Promise<TransactionReceipt> {
    console.log("[useFeedback] sendTransaction called:", { functionName, args });
    
    if (!account) {
      throw new FeedbackError("No account available", ErrorCodes.NO_ACCOUNT);
    }
    
    if (!syncClient) {
      throw new FeedbackError("Sync client not initialized", ErrorCodes.NO_CLIENT);
    }
    
    try {

      // Get the next nonce for this transaction
      console.log("[useFeedback] Getting next nonce...");
      const nonce = getNextNonce();
      console.log("[useFeedback] Nonce:", nonce);
      const data = encodeFunctionData({
        abi: karmaAbi,
        functionName,
        args,
      });

      const serializedTransaction = await account.signTransaction({
        to: CHAT_CONTRACT,
        data,
        nonce,
        gas: DEFAULT_GAS,
        gasPrice: GAS_PRICE,
        chainId: chain.id,
      });

      // Send transaction using syncClient
      const receipt = await syncClient.sendRawTransactionSync({
        serializedTransaction,
      });

      return receipt as TransactionReceipt;
    } catch (error) {
      const feedbackError = handleError(error, `Transaction ${functionName} failed`);
      console.error(`[useFeedback] ${functionName} failed:`, feedbackError);
      throw feedbackError;
    }
  }

  async function read<T = unknown>({ functionName, args }: TransactionData): Promise<T | null> {
    if (!publicClient) return null;
    
    return await publicClient.readContract({
      abi: karmaAbi,
      address: CHAT_CONTRACT as Address,
      functionName,
      args,
    }) as T;
  }


  async function sendMessage(props: SendMessageParams): Promise<TransactionReceipt> {
    const { message, topicName } = props;

    if (!message?.trim()) {
      throw new FeedbackError("Message cannot be empty", ErrorCodes.INVALID_INPUT);
    }

    if (!topicName?.trim()) {
      throw new FeedbackError("Topic name cannot be empty", ErrorCodes.INVALID_INPUT);
    }

    console.log("[useFeedback] Sending message:", { message, topicName });

    try {
      const receipt = await sendTransaction({
        functionName: "sendMessageToTopic",
        args: [message, topicName],
      });

      toast(<ToastMessage title="Message sent!" content="" />, {
        type: "success",
      });

      return receipt;
    } catch (error) {
      const feedbackError = error instanceof FeedbackError ? error : handleError(error, "Failed to send message");
      toast(
        <ToastMessage 
          title="Failed to send message" 
          content={feedbackError.message} 
        />, 
        { type: "error" }
      );
      throw feedbackError;
    }
  }


  async function registerUser(username: string): Promise<TransactionReceipt> {
    console.log("[useFeedback] registerUser called with username:", username);
    
    if (!username?.trim()) {
      throw new FeedbackError("Username cannot be empty", ErrorCodes.INVALID_INPUT);
    }

    if (!account?.address) {
      throw new FeedbackError("No account available", ErrorCodes.NO_ACCOUNT);
    }

    try {
      console.log("[useFeedback] Sending registerUser transaction...");
      const receipt = await sendTransaction({
        functionName: "registerUser",
        args: [username],
      });

      console.log("[useFeedback] registerUser receipt:", receipt);

      // Update cache after successful registration
      console.log("[useFeedback] Updating cache after registration");
      registrationCache.set(account.address, {
        isRegistered: true,
        userId: username
      });

      setUserId(username);

      toast(
        <ToastMessage title="Registration successful!" content="You can now send messages" />,
        { type: "success" }
      );

      return receipt;
    } catch (error) {
      const feedbackError = error instanceof FeedbackError ? error : handleError(error, "Registration failed");
      toast(
        <ToastMessage 
          title="Registration failed" 
          content={feedbackError.message} 
        />, 
        { type: "error" }
      );
      throw feedbackError;
    }
  }


  async function getUserId(address: Address): Promise<string | null> {
    console.log("[useFeedback] getUserId called for address:", address);
    
    // Check cache first
    const cached = registrationCache.get(address);
    if (cached && cached.userId) {
      console.log("[useFeedback] Using cached user ID:", cached.userId);
      return cached.userId;
    }
    
    console.log("[useFeedback] Cache miss or no userId, fetching from chain...");
    const userId = await read<string>({
      functionName: "userId",
      args: [address],
    });

    console.log("[useFeedback] getUserId result:", userId);
    
    if (!userId) return null;
    
    // Update cache with userId
    registrationCache.update(address, {
      isRegistered: true,
      userId: userId
    });
    
    return userId;
  }

  async function checkUserRegistered(address: Address): Promise<boolean> {
    console.log("[useFeedback] checkUserRegistered called for address:", address);
    
    // Check cache first
    const cached = registrationCache.get(address);
    if (cached !== undefined) {
      console.log("[useFeedback] Using cached registration status:", cached.isRegistered);
      return cached.isRegistered;
    }
    
    console.log("[useFeedback] Cache miss, fetching from chain...");
    const isRegistered = await read<boolean>({
      functionName: "isUserRegistered",
      args: [address],
    });

    console.log("[useFeedback] checkUserRegistered result:", isRegistered);
    
    // Update cache
    registrationCache.set(address, {
      isRegistered: isRegistered || false
    });
    
    return isRegistered || false;
  }

  function clearRegistrationCache(address?: Address): void {
    if (address) {
      console.log("[useFeedback] Clearing cache for address:", address);
      registrationCache.delete(address);
    } else {
      console.log("[useFeedback] Clearing entire registration cache");
      registrationCache.clear();
    }
  }

  return {
    getUserId,
    registerUser,
    sendMessage,
    checkUserRegistered,
    clearRegistrationCache,
  };
}