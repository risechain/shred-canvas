import { riseStaging } from "@/chain/riseStaging";
import { Address } from "viem";
import { riseTestnet } from "viem/chains";

export function getNetworkConfig(environment: string) {
  switch (environment) {
    case "staging":
    case "local":
    case "test":
      return {
        chain: riseStaging,
        contract: (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_STAGING ||
          "0x0a8d0B15f68C49A8d3351F9D0e539375360D8e2D") as Address,
        wss:
          process.env.NEXT_PUBLIC_RPC_URL_WSS_STAGING ||
          "wss://staging.riselabs.xyz/ws",
        http:
          process.env.NEXT_PUBLIC_RPC_URL_STAGING ||
          "https://staging.riselabs.xyz",
        canvasSize: parseInt(
          process.env.NEXT_PUBLIC_CANVAS_SIZE_STAGING || "32"
        ),
      };
    case "production":
    default:
      return {
        chain: riseTestnet,
        contract: (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
          "0x39A9625E535e7E6c65b4B63E82Edf0c341C678C7") as Address,
        wss:
          process.env.NEXT_PUBLIC_RPC_URL_WSS ||
          "wss://testnet.riselabs.xyz/ws",
        http: process.env.NEXT_PUBLIC_RPC_URL || "https://testnet.riselabs.xyz",
        canvasSize: parseInt(process.env.NEXT_PUBLIC_CANVAS_SIZE || "64"),
      };
  }
}

export function useNetworkConfig() {
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || "production";
  return getNetworkConfig(environment);
}
