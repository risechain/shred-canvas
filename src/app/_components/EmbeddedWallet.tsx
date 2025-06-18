import {
  Button,
  Separator,
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui";
import { useWallet } from "@/hooks/contract/useWallet";
import { usePage } from "@/hooks/usePage";
import { getMaskedAddress } from "@/lib/utils";
import Link from "next/link";
import { useTransactionCount } from "wagmi";

export function EmbeddedWalletContent() {
  const { setIsResetting, resetWalletClient, wallet } = useWallet();
  const { processingType, setProcessingType } = usePage();

  // Fix this
  const transaction = useTransactionCount({ address: wallet.account.address });
  console.log("transaction:: ", transaction);

  return (
    <div>
      <p className="text-md md:text-lg text-text-accent pb-5">
        Embedded Wallet
      </p>
      <div className="flex flex-col gap-2">
        <Separator />

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm md:text-md text-text-secondary">Address:</p>
          <p className="text-sm md:text-md">
            {getMaskedAddress(wallet.account.address)}
          </p>
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm md:text-md text-text-secondary">
            Current Nonce:
          </p>
          <p className="text-sm md:text-md">
            {transaction.data?.toString() ?? 0}
          </p>
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm md:text-md text-text-secondary">
            Pending Transactions:
          </p>
          <p className="text-sm md:text-md">0</p>
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-2">
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
