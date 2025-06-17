"use client";

import { Separator } from "@/components/ui";
import { BrushSettings } from "./_components/BrushSettings";
import { DrawingCanvas } from "./_components/DrawingCanvas";
import { EmbeddedWalletContent } from "./_components/EmbeddedWallet";
import { BrushPreview } from "./_components/BrushPreview";

export default function Home() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 py-3 h-full max-h-[calc(100vh_-_90px)]">
      <div className="flex-[0_0_20%] flex flex-col min-w-2xs gap-5 p-3 border border-accent h-full rounded bg-card">
        <p className="text-xl md:text-3xl font-medium">Paint Canvas</p>
        <Separator />
        <EmbeddedWalletContent />
      </div>

      <DrawingCanvas />

      <div className="flex-[0_0_20%] flex flex-col min-w-2xs gap-5 p-3 border border-accent h-full rounded bg-card">
        <BrushSettings />
        <Separator />
        <BrushPreview />
      </div>
    </div>
  );
}
