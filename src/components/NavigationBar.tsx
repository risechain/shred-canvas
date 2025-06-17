"use client";

import { Button, Separator } from "@/components/ui";
import { MoonIcon, SettingsIcon, SunIcon, WalletIcon } from "lucide-react";
import { RiseLogo } from "./RiseLogo";
import { useTheme } from "next-themes";
import { useNavigation } from "@/hooks/useNavigation";
import Link from "next/link";
import { useModal } from "@/hooks/useModal";
import { EmbeddedWalletContent } from "@/app/_components/EmbeddedWallet";
import { BrushPreview } from "@/app/_components/BrushPreview";
import { BrushSettings } from "@/app/_components/BrushSettings";

export function NavigationBar() {
  const { theme, setTheme } = useTheme();
  const { showModal } = useModal();

  return (
    <div className="flex items-center justify-center rounded-sm  w-full pt-2 pb-2.5 px-4 bg-primary">
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center justify-start gap-4">
          <RiseLogo preferredLogoTheme="dark" />
        </div>
        <div className="flex items-center justify-start gap-1">
          <Button
            variant="secondary"
            className="md:hidden"
            onClick={() => {
              showModal({
                content: (
                  <>
                    <p className="text-xl md:text-3xl font-medium">
                      Paint Canvas
                    </p>
                    <Separator />
                    <EmbeddedWalletContent />
                  </>
                ),
              });
            }}
          >
            <WalletIcon />
          </Button>
          <Button
            variant="secondary"
            className="md:hidden"
            onClick={() => {
              showModal({
                content: (
                  <>
                    <BrushSettings />
                    <Separator />
                    <BrushPreview />
                  </>
                ),
              });
            }}
          >
            <SettingsIcon />
          </Button>
          <Separator
            orientation="vertical"
            className="min-h-6 bg-separator-secondary md:hidden"
          />
          <Button
            variant="ghost"
            onClick={() => {
              setTheme(theme === "light" ? "dark" : "light");
            }}
          >
            {theme === "light" ? (
              <MoonIcon className="h-4 w-3" color="var(--color-invert)" />
            ) : (
              <SunIcon className="h-4 w-3" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
