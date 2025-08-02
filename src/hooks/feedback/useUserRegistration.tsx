import { useEffect, useState } from "react";
import { useWallet } from "../contract/useWallet";
import { useFeedback } from "./useFeedback";
import { useFeedbackContext } from "../useFeedbackContext";
import { useUsernameDialog } from "@/providers/UsernameDialogProvider";

export function useUserRegistration() {
  const { account } = useWallet();
  const { checkUserRegistered, getUserId, registerUser } = useFeedback();
  const { userId, setUserId } = useFeedbackContext();
  const { showDialog } = useUsernameDialog();
  
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check registration status on mount and when account changes
  useEffect(() => {
    const checkStatus = async () => {
      console.log("[Registration] Checking registration status for account:", account?.address);
      
      if (!account?.address) {
        console.log("[Registration] No account address available");
        setIsLoading(false);
        setIsRegistered(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log("[Registration] Calling checkUserRegistered...");
        const registered = await checkUserRegistered(account.address);
        console.log("[Registration] User registered status:", registered);
        setIsRegistered(registered);

        if (registered) {
          // Get and store the user ID
          console.log("[Registration] User is registered, fetching user ID...");
          const id = await getUserId(account.address);
          console.log("[Registration] User ID retrieved:", id);
          setUserId(id as string);
        } else {
          console.log("[Registration] User is not registered");
        }
      } catch (error) {
        console.error("[Registration] Error checking registration status:", error);
        setIsRegistered(false);
      } finally {
        setIsLoading(false);
        console.log("[Registration] Registration check complete");
      }
    };

    checkStatus();
  }, [account?.address, checkUserRegistered, getUserId, setUserId]);

  const handleRegisterUser = async (username: string) => {
    console.log("[Registration] handleRegisterUser called with username:", username);
    
    if (!account?.address) {
      console.log("[Registration] No account address available for registration");
      return false;
    }

    try {
      console.log("[Registration] Calling registerUser with username:", username);
      const receipt = await registerUser(username);
      console.log("[Registration] Register user receipt:", receipt);
      
      if (receipt) {
        console.log("[Registration] Registration successful, updating state");
        setIsRegistered(true);
        setUserId(username);
        return true;
      }
      console.log("[Registration] Registration failed - no receipt");
      return false;
    } catch (error) {
      console.error("[Registration] Error registering user:", error);
      // Don't throw, just return false
      return false;
    }
  };

  const ensureRegistered = async (): Promise<boolean> => {
    console.log("[Registration] ensureRegistered called, current status:", isRegistered);
    
    if (isRegistered) {
      console.log("[Registration] User already registered, proceeding");
      return true;
    }
    
    if (!account?.address) {
      console.error("[Registration] No account available for registration check");
      return false;
    }

    // Check one more time in case status changed
    console.log("[Registration] Double-checking registration status...");
    const registered = await checkUserRegistered(account.address);
    console.log("[Registration] Double-check result:", registered);
    
    if (registered) {
      console.log("[Registration] User is registered after double-check, fetching ID");
      setIsRegistered(true);
      const id = await getUserId(account.address);
      console.log("[Registration] User ID from double-check:", id);
      if (id) {
        setUserId(id);
      }
      return true;
    }

    // Show username dialog and wait for registration
    console.log("[Registration] User not registered, showing username dialog");
    
    return new Promise((resolve) => {
      showDialog(async (username: string) => {
        const success = await handleRegisterUser(username);
        resolve(success);
        return success;
      });
    });
  };

  return {
    isRegistered,
    isLoading,
    userId,
    ensureRegistered,
  };
}