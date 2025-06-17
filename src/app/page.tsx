"use client";

import { Card, Separator } from "@/components/ui";
import { DrawingCanvas } from "./_components/DrawingCanvas";
import { EmbeddedWalletContent } from "./_components/EmbeddedWallet";
import { cn } from "@/lib/utils";
import { BrushSettings } from "./_components/BrushSettings";

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

      <div
        className={cn(
          "flex-1 h-full w-full min-w-2xs bg-accent/50"
          // "relative before:absolute before:inset-0 before:bg-[linear-gradient(to_right,var(--gray-6)_1px,transparent_1px),linear-gradient(to_bottom,var(--gray-6)_1px,transparent_1px)] before:bg-[size:20px_20px]"
        )}
      >
        <DrawingCanvas />
      </div>

      <div className="flex-[0_0_20%] flex flex-col min-w-2xs gap-5 p-3 border border-accent h-full rounded bg-card">
        <div>
          <p className="text-md md:text-lg text-text-accent">Brush Settings</p>
          <BrushSettings />
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
