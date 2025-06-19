import { Button, Card } from "@/components/ui";
import { useWallet } from "@/hooks/contract/useWallet";
import { useModal } from "@/hooks/useModal";
import { getMaskedAddress } from "@/lib/utils";
import { CopyIcon } from "lucide-react";
import Link from "next/link";
import { formatEther } from "viem";
import { useBalance } from "wagmi";

export function FundWallet() {
  const { wallet, setIsResetting, resetWalletClient } = useWallet();

  const balance = useBalance({
    address: wallet.account.address,
  });

  const { onClose } = useModal();

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error(error);
      alert("Failed to copy!");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="gap-0">
        <p className="text-base text-text-accent">Balance</p>
        <p className="text-lg">
          {formatEther(balance.data?.value ?? 0n)} {balance.data?.symbol}
        </p>
      </Card>

      <Card className="gap-0">
        <p className="text-base text-text-accent">Embedded Wallet Address</p>
        <div className="flex gap-4 items-center">
          <p className="text-lg">{getMaskedAddress(wallet.account.address)}</p>
          <Button
            variant="ghost"
            className="p-0 hover:opacity-50"
            asChild
            onClick={() => {
              handleCopy(wallet.account.address);
            }}
          >
            <CopyIcon size={16} />
          </Button>
        </div>
      </Card>

      <p className="text-sm pt-2 text-center">
        Fund your embedded Wallet to continue!
      </p>
      <div className="flex gap-2 items-center justify-center">
        <Button
          onClick={() => {
            resetWalletClient();
            setIsResetting(true);
          }}
        >
          Reset Wallet
        </Button>
        <Button asChild className="w-fit self-center">
          <Link
            href="https://faucet.testnet.riselabs.xyz/"
            target="_blank"
            onClick={onClose}
          >
            Fund Wallet
          </Link>
        </Button>
      </div>
    </div>
  );
}
