import { DISCORD, DOCS, RISE, X } from "@/lib/url";

export type NavigationItem = {
  id: string;
  label: string;
  path: string;
  isDisabled: boolean;
};

export type Navigation = NavigationItem & {
  subMenu?: NavigationItem[];
};

export function useNavigation() {
  const navItems: Navigation[] = [
    {
      id: "home",
      label: "Home",
      path: "/",
      isDisabled: false,
    },
    {
      id: "apps",
      label: "Apps",
      path: "/apps",
      isDisabled: false,
    },
    {
      id: "build",
      label: "Build",
      path: "/build",
      isDisabled: false,
      // subMenu: [
      //   {
      //     id: "build-home",
      //     label: "Home",
      //     path: "/build",
      //     isDisabled: false,
      //   },
      //   {
      //     id: "build-shreds",
      //     label: "Shreds",
      //     path: "/build/shreds",
      //     isDisabled: false,
      //   },
      //   {
      //     id: "build-tools-and-infra",
      //     label: "Infra & Tooling",
      //     path: "/build/tools-and-infra",
      //     isDisabled: false,
      //   },
      //   {
      //     id: "build-aa-demo",
      //     label: "AA Demo",
      //     path: "/build/aa-demo",
      //     isDisabled: false,
      //   },
      //   {
      //     id: "build-shred-demo",
      //     label: "Shred Demo",
      //     path: "/build/shred-demo",
      //     isDisabled: false,
      //   },
      // ],
    },
  ];

  const footerItems: Navigation[] = [
    {
      id: "rise",
      label: "RISE",
      path: RISE,
      isDisabled: false,
    },
    {
      id: "docs",
      label: "Docs",
      path: DOCS,
      isDisabled: false,
    },
    {
      id: "x",
      label: "X",
      path: X,
      isDisabled: false,
    },
    {
      id: "discord",
      label: "Discord",
      path: DISCORD,
      isDisabled: false,
    },
  ];

  return { navItems, footerItems };
}
