"use client";

import { cn } from "@/lib/utils";
import { MessageBox } from "./MessageBox";
import { useWallet } from "@/hooks/contract/useWallet";
import { MessageCircle } from "lucide-react";
import { useState } from "react";

export function ChatBox() {
  const { account } = useWallet();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Chat button */}
      <div
        data-hidden={!account}
        className="fixed right-4 bottom-4 z-20 rounded-full data-[hidden=true]:hidden"
      >
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "bg-primary rounded-full shadow-lg py-2.5 px-3 hover:scale-125 transition-all",
            open && "mr-2 scale-125"
          )}
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      </div>
      
      {/* Chat box */}
      {open && (
        <div className="fixed right-20 bottom-4 z-20 bg-background max-w-3xs md:max-w-sm rounded-md shadow-lg border">
          <MessageBox onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}