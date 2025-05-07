"use client";

import { useSidebar } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Demo } from "./_demo/Demo";

export default function Home() {
  const { state } = useSidebar();

  return (
    // Remove me!
    <div
      data-state={state}
      className={cn(
        "h-full data-[state=expanded]:ml-[300px] data-[state=collapsed]:ml-16 transition-all",
        "data-[state=collapsed]:max-md:ml-0 data-[state=expanded]:max-md:ml-0"
      )}
    >
      <Demo />
    </div>
  );
}
