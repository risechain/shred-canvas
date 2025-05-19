import { useTheme } from "next-themes";
import Image from "next/image";

export type RiseLogoProps = {
  preferredLogoTheme?: "dark" | "light";
};

export function RiseLogo(props?: RiseLogoProps) {
  const { theme } = useTheme();
  const preferredLogoTheme = props?.preferredLogoTheme;

  function getRiseLogo() {
    if (preferredLogoTheme) {
      return preferredLogoTheme === "light"
        ? "/icons/rise-light.svg"
        : "/icons/rise-dark.svg";
    }

    return theme === "light" // doesnt work with dynamic theme
      ? "/icons/rise-light.svg"
      : "/icons/rise-dark.svg";
  }
  return (
    <Image
      src={getRiseLogo()}
      alt="RISE Logo"
      width={60}
      height={20}
      priority
    />
  );
}
