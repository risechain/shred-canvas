import { defineChain } from "viem";

export const riseStaging = /*#__PURE__*/ defineChain({
  id: 11_155_008,
  name: "RISE Testnet",
  nativeCurrency: { name: "RISE Testnet Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://staging.riselabs.xyz"],
      webSocket: ["wss://staging.riselabs.xyz/ws"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://explorer.staging.riselabs.xyz/",
      apiUrl: "https://explorer.staging.riselabs.xyz/api",
    },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
    },
  },
  testnet: true,
});
