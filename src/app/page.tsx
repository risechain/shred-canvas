"use client";

import { Separator } from "@/components/ui";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { BrushSettings } from "./_components/BrushSettings";
import { DrawingCanvas } from "./_components/DrawingCanvas";
import { EmbeddedWalletContent } from "./_components/EmbeddedWallet";
import { WipeCanvas } from "./_components/WipeCanvas";
import { usePage } from "@/hooks/usePage";

export function EmbeddedWallet() {
  const { bgCanvas } = usePage();
  return (
    <ResizablePanel
      data-transparent={bgCanvas.includes("bg-")}
      className="p-4 flex flex-col gap-4 bg-[var(--gray-2)] data-[transparent=true]:bg-background/85 max-xl:hidden"
      defaultSize={20}
      minSize={10}
      maxSize={30}
    >
      <p className="text-xl md:text-3xl font-medium">Paint Canvas</p>
      <Separator />
      <EmbeddedWalletContent />
    </ResizablePanel>
  );
}

export function Settings() {
  const { bgCanvas } = usePage();
  return (
    <ResizablePanel
      data-transparent={bgCanvas.includes("bg-")}
      className="p-4 flex flex-col gap-4 bg-[var(--gray-2)] data-[transparent=true]:bg-background/85 max-lg:hidden"
      defaultSize={20}
      minSize={15}
      maxSize={25}
    >
      <BrushSettings />
      <WipeCanvas />
    </ResizablePanel>
  );
}

export default function Home() {
  const { bgCanvas } = usePage();

  function getCanvasBg() {
    if (bgCanvas.includes("bg-")) {
      return { backgroundImage: `url(/images/${bgCanvas})` };
    } else {
      return { background: bgCanvas };
    }
  }

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="flex h-full max-h-[calc(100%_-_55px)] overflow-auto rounded-b-md bg-accent dark:bg-accent/35 bg-contain"
      style={{
        ...getCanvasBg(),
      }}
    >
      <EmbeddedWallet />
      <ResizableHandle
        withHandle
        className="bg-accent max-xl:hidden border border-accent-foreground dark:border-border-primary"
      />
      <ResizablePanel defaultSize={60}>
        <DrawingCanvas />
      </ResizablePanel>
      <ResizableHandle
        withHandle
        className="bg-accent max-lg:hidden border border-accent-foreground dark:border-border-primary"
      />
      <Settings />
    </ResizablePanelGroup>
  );
}
