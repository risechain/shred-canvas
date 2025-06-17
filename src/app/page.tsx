"use client";

import { Separator } from "@/components/ui";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/useMobile";
import { BrushPreview } from "./_components/BrushPreview";
import { BrushSettings } from "./_components/BrushSettings";
import { DrawingCanvas } from "./_components/DrawingCanvas";
import { EmbeddedWalletContent } from "./_components/EmbeddedWallet";

export function EmbeddedWallet() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return null;
  }

  return (
    <ResizablePanel
      className="p-5 pl-1 flex flex-col gap-4"
      defaultSize={20}
      minSize={10}
      maxSize={25}
    >
      <p className="text-xl md:text-3xl font-medium">Paint Canvas</p>
      <Separator />
      <EmbeddedWalletContent />
    </ResizablePanel>
  );
}

export function Settings() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return null;
  }

  return (
    <ResizablePanel
      className="p-5 pr-1 flex flex-col gap-4"
      defaultSize={15}
      minSize={10}
      maxSize={20}
    >
      <BrushSettings />
      <Separator />
      <BrushPreview />
    </ResizablePanel>
  );
}

export default function Home() {
  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="flex h-full max-h-[calc(100vh_-_90px)] py-2"
    >
      <EmbeddedWallet />
      <ResizableHandle withHandle className="bg-accent max-md:hidden" />
      <ResizablePanel defaultSize={60}>
        <DrawingCanvas />
      </ResizablePanel>
      <ResizableHandle withHandle className="bg-accent max-md:hidden" />
      <Settings />
    </ResizablePanelGroup>
  );
}
