import { injected } from "@wagmi/connectors";
import { Config, createConfig, http } from "@wagmi/core";
import { sepoliaTestnet } from "./sepolia";

/** Prepare Wagmi Config */
export const config: Config = createConfig({
  chains: [sepoliaTestnet],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
    // TODO: Add support to Wallet Connect
    // TODO: Add support to Coinbase
  ],
  transports: {
    [sepoliaTestnet.id]: http(),
  },
  ssr: true,
});
