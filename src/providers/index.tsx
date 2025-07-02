"use client";

import { config } from "@/chain/config";
import { SidebarProvider } from "@/components/ui";
import { WagmiProvider } from "wagmi";
import { ModalProvider } from "./ModalProvider";
import { PageProvider } from "./PageProvider";
import { QueryClientProvider } from "./QueryProvider";
import { ThemeProvider } from "./ThemeProvider";
import { WebSocketProvider } from "./WebSocketProvider";

type AppProviderProps = {
  children: React.ReactNode;
};

export function AppProvider({ children }: Readonly<AppProviderProps>) {
  return (
    <WagmiProvider config={config} reconnectOnMount={true}>
      <QueryClientProvider>
        <WebSocketProvider>
          <ThemeProvider attribute="class" enableSystem>
            <PageProvider>
              <ModalProvider>
                <SidebarProvider>{children}</SidebarProvider>
              </ModalProvider>
            </PageProvider>
          </ThemeProvider>
        </WebSocketProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
