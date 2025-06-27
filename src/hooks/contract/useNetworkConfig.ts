import { riseStaging } from "@/chain/riseStaging";
import { Address } from "viem";
import { riseTestnet } from "viem/chains";

export function useNetworkConfig() {
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || "production";

  switch (environment) {
    case "staging":
    case "local":
    case "test":
      return {
        chain: riseStaging,
        contract: "0x0a8d0B15f68C49A8d3351F9D0e539375360D8e2D" as Address,
        wsIndexing: "wss://staging.riselabs.xyz/ws",
        canvasSize: 32,
      };
    case "production":
    default:
      return {
        chain: riseTestnet,
        contract: "0xc7c14Cf3094A9Bb8770148DD18494944469Cc5D8" as Address,
        wsIndexing: "wss://indexing.testnet.riselabs.xyz/ws",
        canvasSize: 64,
      };
  }
}
