"use client";

import { config } from "@/chain/config";
import { SidebarProvider } from "@/components/ui";
import { ApolloProvider } from "@apollo/client";
import { apolloClient } from "@/lib/apollo-client";
import { WagmiProvider } from "wagmi";
import { FeedbackProvider } from "./FeedbackProvider";
import { ModalProvider } from "./ModalProvider";
import { PageProvider } from "./PageProvider";
import { QueryClientProvider } from "./QueryProvider";
import { ThemeProvider } from "./ThemeProvider";
import { WebSocketProvider } from "./WebSocketProvider";
import { UsernameDialogProvider } from "./UsernameDialogProvider";

type AppProviderProps = {
  children: React.ReactNode;
};

export function AppProvider({ children }: Readonly<AppProviderProps>) {
  return (
    <WagmiProvider config={config} reconnectOnMount={true}>
      <QueryClientProvider>
        <ApolloProvider client={apolloClient}>
          <WebSocketProvider>
            <ThemeProvider attribute="class" enableSystem>
              <PageProvider>
                <FeedbackProvider>
                  <UsernameDialogProvider>
                    <ModalProvider>
                      <SidebarProvider>{children}</SidebarProvider>
                    </ModalProvider>
                  </UsernameDialogProvider>
                </FeedbackProvider>
              </PageProvider>
            </ThemeProvider>
          </WebSocketProvider>
        </ApolloProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
