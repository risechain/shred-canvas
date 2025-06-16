import { createPublicClient, http } from "viem";
import { riseTestnet } from "viem/chains";

export const publicClient = createPublicClient({
  chain: riseTestnet,
  // transport: shredsWebSocket(),
  transport: http(),
});
