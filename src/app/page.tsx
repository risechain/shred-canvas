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

export function EmbeddedWallet() {
  return (
    <ResizablePanel
      className="p-4 flex flex-col gap-4 bg-accent/50 max-xl:hidden"
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
  return (
    <ResizablePanel
      className="p-4 flex flex-col gap-4 bg-accent/50 max-lg:hidden"
      defaultSize={15}
      minSize={10}
      maxSize={25}
    >
      <BrushSettings />
    </ResizablePanel>
  );
}

export default function Home() {
  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="flex h-full max-h-[calc(100%_-_55px)] overflow-auto rounded-b-md"
    >
      <EmbeddedWallet />
      <ResizableHandle withHandle className="bg-accent max-xl:hidden" />
      <ResizablePanel defaultSize={60}>
        <DrawingCanvas />
      </ResizablePanel>
      <ResizableHandle withHandle className="bg-accent max-lg:hidden" />
      <Settings />
    </ResizablePanelGroup>
  );
}
