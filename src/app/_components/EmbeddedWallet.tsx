import {
  Button,
  Collapsible,
  CollapsibleContent,
  Input,
  Separator,
} from "@/components/ui";
import { useWallet } from "@/hooks/contract/useWallet";
import { usePage } from "@/hooks/usePage";
import { getMaskedAddress, handleCopy } from "@/lib/utils";
import { CopyIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatEther } from "viem";
import { useBalance, useTransactionCount } from "wagmi";

export function EmbeddedWalletContent() {
  const { setIsResetting, resetWalletClient, wallet, getStoredWallet } =
    useWallet();
  const { processingType, pendingTx, completedTx, batchSize, setBatchSize } =
    usePage();

  const balance = useBalance({
    address: wallet.account.address,
  });

  const transaction = useTransactionCount({ address: wallet.account.address });

  const [inputType, setInputType] = useState<"password" | "text">("password");

  const storedWallet = getStoredWallet();

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
              {getMaskedAddress(storedWallet?.address ?? "")}
            </p>
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
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm md:text-md text-text-secondary">Private Key:</p>
          <div className="flex gap-4 items-center">
            <input
              type={inputType}
              value={storedWallet?.privateKey ?? ""}
              className="w-full text-sm"
            />
            <div className="flex gap-3 items-center">
              <Button
                variant="ghost"
                className="p-0 hover:opacity-50"
                asChild
                onClick={() => {
                  if (inputType === "password") {
                    setInputType("text");
                  } else {
                    setInputType("password");
                  }
                }}
              >
                {inputType !== "password" ? (
                  <EyeIcon size={18} />
                ) : (
                  <EyeOffIcon size={18} />
                )}
              </Button>
              <Button
                variant="ghost"
                className="p-0 hover:opacity-50"
                asChild
                onClick={() => {
                  handleCopy(storedWallet.privateKey);
                }}
              >
                <CopyIcon size={16} />
              </Button>
            </div>
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
          <p className="text-sm md:text-md">{pendingTx}</p>
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm md:text-md text-text-secondary">
            Completed Transactions:
          </p>
          <p className="text-sm md:text-md">{completedTx}</p>
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm md:text-md text-text-secondary">
            Processing Option:
          </p>
          <p className="text-sm md:text-md">Batch</p>
        </div>

        <Separator />

        <Collapsible open={processingType === "batch"}>
          <CollapsibleContent className="space-y-3">
            <div className="flex gap-2 justify-between items-center">
              <p className="flex-1 text-sm md:text-md text-text-secondary">
                Batch Size:
              </p>
              <Input
                type="number"
                min={100}
                value={batchSize}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (value > 1000) return;
                  setBatchSize(value);
                  localStorage.setItem("batch-size", value.toString());
                }}
                className="flex-1 border border-border-primary rounded"
              />
            </div>
            <Separator />
          </CollapsibleContent>
        </Collapsible>
      </div>
      <div className="flex flex-wrap gap-2 pt-4 justify-end">
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
