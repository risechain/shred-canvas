/**
 * RISE Testnet
 *
 * Docs: https://wagmi.sh/core/api/chains#create-chain
 */

import { type Chain } from "viem";

export const riseTestnet = {
  id: 11155931,
  name: "RISE Testnet",
  nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://testnet.riselabs.xyz/"],
    },
  },
  blockExplorers: {
    default: {
      name: "RISE Testnet",
      url: "https://explorer.testnet.riselabs.xyz/",
    },
  },
  // contracts: {} // Add as needed
} as const satisfies Chain;
