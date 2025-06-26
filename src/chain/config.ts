import { injected } from "@wagmi/connectors";
import { Config, createConfig, http } from "@wagmi/core";
import { riseTestnet } from "viem/chains";
import { riseStaging } from "./riseStaging";

/** Prepare Wagmi Config */
export const config: Config = createConfig({
  chains: [riseTestnet, riseStaging],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [riseTestnet.id]: http(),
    [riseStaging.id]: http(),
  },
  ssr: true,
});
