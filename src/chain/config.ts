import { injected } from "@wagmi/connectors";
import { Config, createConfig, http } from "@wagmi/core";
import { riseTestnet } from "viem/chains";

/** Prepare Wagmi Config */
export const config: Config = createConfig({
  chains: [riseTestnet],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [riseTestnet.id]: http(),
  },
  ssr: true,
});
