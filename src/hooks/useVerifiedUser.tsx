import { useAccount } from "wagmi";

export function useVerifiedUser() {
  const { address } = useAccount();
  
  // For now, return a simplified version
  // In the reference app this might use a more complex verification system
  return {
    metadata: {
      username: address ? `user_${address.slice(0, 6)}` : undefined,
    },
  };
}