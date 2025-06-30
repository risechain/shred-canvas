"use client";

import { BrushSettings } from "@/app/_components/BrushSettings";
import { EmbeddedWalletContent } from "@/app/_components/EmbeddedWallet";
import { Button, Separator } from "@/components/ui";
import { useIsMobile } from "@/hooks/useMobile";
import { useModal } from "@/hooks/useModal";
import { MoonIcon, SettingsIcon, SunIcon, WalletIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { RiseLogo } from "./RiseLogo";

export function NavigationBar() {
  const { theme, setTheme } = useTheme();
  const { showModal } = useModal();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  // Only run on client-side to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex items-center justify-center rounded-t-sm w-full pt-2 pb-2.5 px-4 bg-primary">
      <div className="flex flex-wrap justify-between items-center w-full">
        <div className="flex flex-wrap items-center justify-start gap-4">
          <RiseLogo preferredLogoTheme="dark" />
        </div>
        <div className="flex items-center justify-start gap-1">
          <Button
            variant="secondary"
            className="xl:hidden"
            onClick={() => {
              showModal({
                isSheet: true,
                side: isMobile ? "bottom" : "left",
                contentProps: { className: "bg-sidebar max-md:max-h-[85vh]" },
                content: (
                  <div className="flex flex-col gap-4">
                    <p className="text-xl md:text-3xl font-medium">
                      Paint Canvas
                    </p>
                    <Separator />
                    <EmbeddedWalletContent />
                  </div>
                ),
              });
            }}
          >
            <WalletIcon />
          </Button>
          <Button
            variant="secondary"
            className="lg:hidden"
            onClick={() => {
              showModal({
                isSheet: true,
                contentProps: { className: "bg-sidebar max-md:max-h-[85vh]" },
                side: isMobile ? "bottom" : "left",
                content: <BrushSettings />,
              });
            }}
          >
            <SettingsIcon />
          </Button>
          <Separator
            orientation="vertical"
            className="min-h-6 bg-separator-secondary md:hidden ml-2"
          />
          <Button
            variant="ghost"
            onClick={() => {
              setTheme(theme === "light" ? "dark" : "light");
            }}
          >
            {!mounted ? (
              <SunIcon className="h-4 w-3" />
            ) : theme === "light" ? (
              <MoonIcon className="h-4 w-3 stroke-white" />
            ) : (
              <SunIcon className="h-4 w-3" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
