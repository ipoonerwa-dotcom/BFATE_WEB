/* 付款计数的纯逻辑（不依赖服务端环境，便于拿真实链上回执单独测试）。 */
import { erc20Abi, parseEventLogs, type Log } from "viem";

/** 一笔交易里，payer 向 payTo 转了多少 token；按 price 能折算成几次。 */
export function paidCount(logs: Log[], o: { token: string; payer: string; payTo: string; price: bigint }) {
  const transfers = parseEventLogs({ abi: erc20Abi, eventName: "Transfer", logs }).filter(
    (l) =>
      l.address.toLowerCase() === o.token.toLowerCase() &&
      l.args.from.toLowerCase() === o.payer.toLowerCase() &&
      l.args.to.toLowerCase() === o.payTo.toLowerCase(),
  );
  const paid = transfers.reduce((s, l) => s + l.args.value, 0n);
  return { paid, count: o.price > 0n ? Number(paid / o.price) : 0 };
}
