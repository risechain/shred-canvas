import {
  Button,
  Separator,
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui";
import { useWallet } from "@/hooks/contract/useWallet";
import { usePage } from "@/hooks/usePage";
import { getMaskedAddress } from "@/lib/utils";
import { CopyIcon } from "lucide-react";
import Link from "next/link";
import { formatEther } from "viem";
import { useBalance, useTransactionCount } from "wagmi";

export function EmbeddedWalletContent() {
  const { setIsResetting, resetWalletClient, wallet } = useWallet();
  const { processingType, setProcessingType } = usePage();

  const balance = useBalance({
    address: wallet.account.address,
  });

  const transaction = useTransactionCount({ address: wallet.account.address });
  console.log("balance:: ", balance);

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error(error);
      alert("Failed to copy!");
    }
  }

  return (
    <div>
      <p className="text-md md:text-lg text-text-accent pb-5">
        Embedded Wallet
      </p>
      <div className="flex flex-col gap-2">
        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm md:text-md text-text-secondary">Address:</p>
          <div className="flex gap-4 items-center">
            <p className="text-sm md:text-md">
              {getMaskedAddress(wallet.account.address)}
            </p>
            <Button
              variant="ghost"
              className="p-0 hover:opacity-25"
              asChild
              onClick={() => {
                handleCopy(wallet.account.address);
              }}
            >
              <CopyIcon size={16} />
            </Button>
          </div>
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm md:text-md text-text-secondary">Balance:</p>
          <div className="flex gap-1 items-center">
            <p className="text-sm md:text-md">
              {formatEther(balance.data?.value ?? 0n)}
            </p>
            <p className="text-sm md:text-md">{balance.data?.symbol}</p>
          </div>
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm md:text-md text-text-secondary">
            Current Nonce:
          </p>
          <p className="text-sm md:text-md">
            {transaction.data?.toString() ?? 0}
          </p>
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm md:text-md text-text-secondary">
            Pending Transactions:
          </p>
          <p className="text-sm md:text-md">0</p>
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm md:text-md text-text-secondary">
            Sent Transactions:
          </p>
          <p className="text-sm md:text-md">0</p>
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm md:text-md text-text-secondary">
            Transaction Processing:
          </p>

          <ToggleGroup type="single" value={processingType}>
            <ToggleGroupItem
              value="individual"
              className="px-4"
              onClick={() => {
                setProcessingType("individual");
              }}
            >
              Individual
            </ToggleGroupItem>
            <ToggleGroupItem
              value="batch"
              className="px-4"
              onClick={() => {
                setProcessingType("batch");
              }}
            >
              Batch
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Separator />
      </div>
      <div className="flex flex-wrap gap-2 pt-8 justify-end">
        <Button
          className="flex-1 rounded-md"
          onClick={() => {
            resetWalletClient();
            setIsResetting(true);
          }}
        >
          Reset Wallet
        </Button>
        <Button asChild className="flex-1">
          <Link href="https://faucet.testnet.riselabs.xyz/" target="_blank">
            Request Token
          </Link>
        </Button>
      </div>
    </div>
  );
}
