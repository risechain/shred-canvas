import { Button, Separator } from "@/components/ui";
import { useNetworkConfig } from "@/hooks/contract/useNetworkConfig";
import { useWallet } from "@/hooks/contract/useWallet";
import { useNonceManager } from "@/hooks/useNonceManager";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { encodeFunctionData, parseAbiItem } from "viem";
import { useReadContract } from "wagmi";
import canvasAbi from "../../../abi/canvasAbi.json";

export function WipeCanvas() {
  const { contract, chain } = useNetworkConfig();
  const { shredClient, syncClient, account, wallet, publicClient } = useWallet();
  const [isWiping, setIsWiping] = useState(false);
  const [timeUntilNextWipe, setTimeUntilNextWipe] = useState<number>(0);

  // Initialize nonce manager
  const {
    getNextNonce,
    resetNonce,
    isNonceInitialized: nonceInitialized,
  } = useNonceManager(wallet.account?.address, publicClient);

  // Read the next wipe time from the contract
  const { data: nextWipeTime, refetch: refetchNextWipeTime } = useReadContract({
    abi: canvasAbi,
    address: contract,
    functionName: "getNextWipeTime",
    chainId: chain.id,
  });

  // Update countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      if (nextWipeTime && Number(nextWipeTime) > 0) {
        const now = Math.floor(Date.now() / 1000);
        const timeLeft = Number(nextWipeTime) - now;
        setTimeUntilNextWipe(Math.max(0, timeLeft));
      } else {
        setTimeUntilNextWipe(0);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [nextWipeTime]);

  // Listen for canvas wipe events
  useEffect(() => {
    const unwatch = shredClient.watchShredEvent({
      event: parseAbiItem(
        "event canvasWiped(address indexed wiper, uint256 timestamp)"
      ),
      onLogs: () => {
        refetchNextWipeTime();
        toast.success("Canvas has been wiped clean!", {
          duration: 5000,
        });
      },
    });

    return () => {
      if (typeof unwatch === "function") {
        unwatch();
      }
    };
  }, [shredClient, refetchNextWipeTime]);

  const handleWipeCanvas = async () => {
    if (!account || !nonceInitialized) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsWiping(true);

    try {
      const data = encodeFunctionData({
        abi: canvasAbi,
        functionName: "wipeCanvas",
        args: [],
      });

      const nonce = getNextNonce();

      const serializedTransaction = await account.signTransaction({
        to: contract,
        data,
        nonce,
        gas: BigInt(5_000_000),
        gasPrice: BigInt(100),
        value: BigInt(0),
        chainId: chain.id,
      });
      
      // Send transaction (don't await receipt, similar to DrawingCanvas pattern)
      syncClient
        .sendRawTransactionSync({
          serializedTransaction,
        })
        .then((_receipt) => {
          toast.success("Canvas wiped successfully!", {
            duration: 5000,
          });
        })
        .catch((txError) => {
          const errorMessage = txError instanceof Error ? txError.message.toLowerCase() : String(txError).toLowerCase();
          
          if (errorMessage.includes("wipeonCooldown") || errorMessage.includes("cooldown")) {
            toast.error("Canvas is on cooldown. Please wait for the timer.");
          } else if (errorMessage.includes("insufficient")) {
            toast.error("Insufficient funds. Please fund your wallet.");
          } else {
            toast.error("Transaction failed. Please try again.");
          }
        });

      // Show immediate feedback
      toast.success("Wiping canvas... This may take a moment.", {
        duration: 3000,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      
      if (errorMessage.includes("wipeonCooldown") || errorMessage.includes("cooldown")) {
        toast.error("Canvas is on cooldown. Please wait for the timer.");
      } else if (errorMessage.includes("insufficient")) {
        toast.error("Insufficient funds. Please fund your wallet.");
      } else if (errorMessage.includes("nonce") || errorMessage.includes("replacement")) {
        resetNonce().catch(() => {});
        toast.error("Transaction failed due to nonce conflict. Please try again.");
      } else {
        toast.error("Failed to wipe canvas. Please try again.");
      }
    } finally {
      setIsWiping(false);
      refetchNextWipeTime();
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const canWipe = timeUntilNextWipe === 0;

  return (
    <div className="flex flex-col gap-4">
      <Button
        onClick={handleWipeCanvas}
        disabled={!canWipe || isWiping}
        variant={canWipe ? "default" : "secondary"}
        className="w-full"
      >
        {isWiping ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Wiping Canvas...
          </>
        ) : canWipe ? (
          "Wipe Canvas Clean"
        ) : (
          `Wipe Cooldown: ${formatTime(timeUntilNextWipe)}`
        )}
      </Button>

      <Separator />
    </div>
  );
}