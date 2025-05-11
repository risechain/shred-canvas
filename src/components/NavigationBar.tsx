"use client";

import { Button, Separator } from "@/components/ui";
import { MoonIcon, SunIcon } from "lucide-react";
import { RiseLogo } from "./RiseLogo";
import { useTheme } from "next-themes";
import { useNavigation } from "@/hooks/useNavigation";
import Link from "next/link";

export function NavigationBar() {
  const { theme, setTheme } = useTheme();
  const { toolbarItems, navItems } = useNavigation();

  return (
    <div className="flex items-center justify-center rounded-sm  w-full pt-2 pb-2.5 px-4 bg-primary">
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center justify-start gap-4">
          <RiseLogo preferredLogoTheme="dark" />
          {navItems.map((item) => {
            return (
              <Button
                key={item.id}
                variant="link"
                asChild
                className="text-invert p-0 text-md"
              >
                <Link href={item.path} target="_blank">
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </div>
        <div className="flex items-center justify-start gap-4">
          {toolbarItems.map((item) => {
            return (
              <Button
                key={item.id}
                variant="link"
                asChild
                className="text-invert p-0 "
              >
                <Link href={item.path} target="_blank">
                  {item.label}
                </Link>
              </Button>
            );
          })}
          <Separator
            orientation="vertical"
            className="min-h-6 bg-separator-secondary"
          />
          <Button
            variant="ghost"
            onClick={() => {
              setTheme(theme === "light" ? "dark" : "light");
            }}
          >
            {theme === "light" ? (
              <MoonIcon className="h-4 w-4" color="var(--color-invert)" />
            ) : (
              <SunIcon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
