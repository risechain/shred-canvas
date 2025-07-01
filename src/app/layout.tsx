import { DynamicFavicon } from "@/components/DynamicFavicon";
import { Modal } from "@/components/Modal";
import { AppProvider } from "@/providers";

import clsx from "clsx";
import type { Metadata } from "next";
import localFont from "next/font/local";

import { NavigationBar } from "@/components/NavigationBar";
import "@fontsource/inter-tight";
import "@fontsource/space-grotesk";
import "@styles/globals.css";

const fkDisplay = localFont({
  src: "../fonts/FKDisplay-RegularAlt.woff",
  variable: "--font-fk-display",
  weight: "400",
});

const fkGrotesk = localFont({
  src: [
    { path: "../fonts/FKGrotesk-Bold.woff", weight: "700" },
    { path: "../fonts/FKGrotesk-BoldItalic.woff", weight: "700" },
    { path: "../fonts/FKGrotesk-Italic.woff", weight: "400" },
    { path: "../fonts/FKGrotesk-Regular.woff", weight: "400" },
    { path: "../fonts/FKGroteskMono-Regular.woff", weight: "400" },
  ],
  variable: "--font-fk-grotesk",
});

export const metadata: Metadata = {
  title: "RISE Shred Canvas",
  description:
    "Discover the power of the Shred API — a client made specifically to interact with Shreds on the RISE Chain!",
  icons: {
    icon: [
      { url: "/favicon_light.svg", media: "(prefers-color-scheme: light)" },
      { url: "/favicon_dark.svg", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={clsx(fkDisplay.variable, fkGrotesk.variable, "font-sans")}
      >
        <AppProvider>
          <DynamicFavicon />
          <Modal />
          <main className="mx-auto max-w-10xl w-full h-auto relative min-h-vh">
            <div className="bg-background p-3 rounded-md1 h-full rounded-md">
              <NavigationBar />
              {children}
            </div>
          </main>
        </AppProvider>
      </body>
    </html>
  );
}
