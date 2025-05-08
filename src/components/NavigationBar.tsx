"use client";

import { Button } from "@/components/ui";
import { MoonIcon, SunIcon } from "lucide-react";
import { RiseLogo } from "./RiseLogo";
import { useTheme } from "next-themes";
import { useNavigation } from "@/hooks/useNavigation";
import Link from "next/link";

export function NavigationBar() {
  const { theme, setTheme } = useTheme();
  const { toolbarItems, navItems } = useNavigation();

  return (
    <div className="flex justify-between rounded-sm border border-border-primary w-full pt-2 pb-2.5 px-4">
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center justify-start gap-4">
          <RiseLogo />
          {navItems.map((item) => {
            return (
              <Button
                key={item.id}
                variant="link"
                asChild
                className="text-foreground p-0 text-md"
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
                className="text-foreground p-0"
              >
                <Link href={item.path} target="_blank">
                  {item.label}
                </Link>
              </Button>
            );
          })}
          <Button
            asChild
            variant="ghost"
            className="p-0"
            onClick={() => {
              setTheme(theme === "light" ? "dark" : "light");
            }}
          >
            {theme === "light" ? (
              <MoonIcon className="h-4 w-4" />
            ) : (
              <SunIcon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
