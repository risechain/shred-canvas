import { Button, Card } from "@/components/ui";
import { useWallet } from "@/hooks/contract/useWallet";
import { getMaskedAddress } from "@/lib/utils";
import Link from "next/link";
import { useTransactionCount } from "wagmi";

export function EmbeddedWalletContent() {
  const { setIsResetting, resetWalletClient, wallet } = useWallet();

  // Fix this
  const transaction = useTransactionCount({ address: wallet.account.address });
  console.log("transaction:: ", transaction);

  return (
    <div>
      <p className="text-md md:text-lg text-text-accent pb-5">
        Embedded Wallet
      </p>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm md:text-md text-text-secondary">Address:</p>
          <p className="text-sm md:text-md">
            {getMaskedAddress(wallet.account.address)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <p className="text-sm md:text-md text-text-secondary">
            Current Nonce:
          </p>
          <p className="text-sm md:text-md">
            {transaction.data?.toString() ?? 0}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <p className="text-sm md:text-md text-text-secondary">
            Pending Transactions:
          </p>
          <p className="text-sm md:text-md">0</p>
        </div>

        <div className="flex items-center gap-2">
          <p className="text-sm md:text-md text-text-secondary">
            Sent Transactions:
          </p>
          <p className="text-sm md:text-md">0</p>
        </div>

        <div className="flex items-center gap-2">
          <p className="text-sm md:text-md text-text-secondary">
            Transaction Processing:
          </p>
          <p className="text-sm md:text-md">Batch | Individual</p>
        </div>
      </div>
      <div className="flex gap-1 pt-8 justify-end">
        <Button
          variant="ghost"
          onClick={() => {
            resetWalletClient();
            setIsResetting(true);
          }}
        >
          Reset Wallet
        </Button>
        <Button asChild>
          <Link href="https://faucet.testnet.riselabs.xyz/" target="_blank">
            Request Token
          </Link>
        </Button>
      </div>
    </div>
  );
}
