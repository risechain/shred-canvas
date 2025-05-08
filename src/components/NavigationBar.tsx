import { Button } from "@/components/ui";
import { MoonIcon, SunIcon } from "lucide-react";
import { RiseLogo } from "./RiseLogo";
import { useTheme } from "next-themes";

export function NavigationBar() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex justify-between rounded-sm border border-border-primary w-full p-4">
      <RiseLogo />
      <div className="flex items-center justify-start">
        <Button
          asChild
          variant="ghost"
          className="h-fit p-0 "
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
  );
}
