/* 付款核验：到链上读这笔交易，确认是本人把至少 1000 枚 $BFATE 转到了收款地址（默认黑洞），每笔只认一次。 */
import "server-only";
import { isHash, parseUnits } from "viem";
import { publicConfig, serverConfig } from "../config";
import { chainClient } from "./chain";
import { kv } from "./kv";
import { paidCount } from "./payment-core";
import { addCredits } from "./quota";

export class PayError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function verifyPayment(payer: `0x${string}`, txHash: string): Promise<{ added: number; credits: number }> {
  const token = publicConfig.token;
  if (!token) throw new PayError("代币地址尚未配置，付费通道暂未开放", 503);
  if (!isHash(txHash)) throw new PayError("交易哈希格式不正确", 400);
  const hash = txHash.toLowerCase() as `0x${string}`;
  if (await kv().get(`tx:${hash}`)) throw new PayError("这笔付款已经使用过了", 409);

  const client = chainClient();
  const receipt = await client.getTransactionReceipt({ hash }).catch(() => null);
  if (!receipt) throw new PayError("交易还没上链，请稍候", 425);
  if (receipt.status !== "success") throw new PayError("这笔交易执行失败了", 400);
  const latest = await client.getBlockNumber();
  if (latest - receipt.blockNumber + 1n < BigInt(serverConfig().confirmations)) throw new PayError("等待区块确认中", 425);

  const price = parseUnits(String(publicConfig.price), publicConfig.tokenDecimals);
  const { count: added } = paidCount(receipt.logs, { token, payer, payTo: publicConfig.payTo, price });
  if (added < 1) throw new PayError(`没有找到你向收款地址支付 ${publicConfig.price} 枚 $${publicConfig.tokenSymbol} 的记录`, 400);

  // 先占位再加额度：同一笔交易并发提交也只会成功一次。
  const first = await kv().set(`tx:${hash}`, { payer, added, at: Date.now() }, { nx: true });
  if (!first) throw new PayError("这笔付款已经使用过了", 409);
  const credits = await addCredits(payer, added);
  return { added, credits };
}
