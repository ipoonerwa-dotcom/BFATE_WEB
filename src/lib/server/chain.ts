import "server-only";
import { createPublicClient, http } from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { publicConfig, serverConfig } from "../config";

let client: ReturnType<typeof createPublicClient> | null = null;

/** 只读链客户端：验签名、查付款交易都走它。 */
export function chainClient() {
  if (client) return client;
  const chain = publicConfig.chainId === 97 ? bscTestnet : bsc;
  client = createPublicClient({ chain, transport: http(serverConfig().rpcUrl, { timeout: 15_000, retryCount: 2 }) });
  return client;
}
