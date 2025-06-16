"use client";

import { Card, Separator } from "@/components/ui";
import { DrawingCanvas } from "./_components/DrawingCanvas";
import { EmbeddedWalletContent } from "./_components/EmbeddedWallet";

export default function Home() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 py-3 h-full max-h-[calc(100vh_-_90px)]">
      <div className="flex-[0_0_20%] flex flex-col min-w-2xs gap-5 p-3 border border-accent h-full rounded bg-card">
        <p className="text-xl md:text-3xl font-medium">Paint Canvas</p>
        <Separator />
        <div>
          <p className="text-md md:text-lg text-text-accent">Embedded Wallet</p>
          <EmbeddedWalletContent />
        </div>
      </div>

      <div className="flex-1 h-full w-full min-w-2xs bg-accent">
        <DrawingCanvas />
      </div>

      <div className="flex-[0_0_20%] flex flex-col min-w-2xs gap-5 p-3 border border-accent h-full rounded bg-card">
        <div>
          <p className="text-md md:text-lg text-text-accent">Brush Settings</p>
          <Card variant="secondary" className="gap-5 md:p-4 rounded mt-5">
            TODO: Brush Settings here
          </Card>
        </div>
        <Separator />
        <div>
          <p className="text-md md:text-lg text-text-accent">Brush Preview</p>
          <Card variant="secondary" className="gap-5 md:p-4 rounded mt-5">
            TODO: Brush Preview
          </Card>
        </div>
      </div>
    </div>
  );
}
