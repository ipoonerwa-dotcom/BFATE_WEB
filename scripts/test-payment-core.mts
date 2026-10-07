/* 付款计数自测：拿 BSC 主网上一笔真实的 USDT 转账回执，验证 paidCount 只认「本人 → 收款地址、够价」的转账。
   用法：npx tsx scripts/test-payment-core.mts */
import { createPublicClient, decodeFunctionData, erc20Abi, http } from "viem";
import { bsc } from "viem/chains";
import { paidCount } from "../src/lib/server/payment-core";

const USDT = "0x55d398326f99059fF775485246999027B3197955";
const client = createPublicClient({ chain: bsc, transport: http(process.env.BSC_RPC_URL || "https://bsc-dataseed.bnbchain.org") });

// 不用 getLogs（公共节点限制多）：直接在最新的几个块里找一笔直接调用 USDT.transfer 的交易，和用户付款的形态一样。
let found: { hash: `0x${string}`; from: `0x${string}`; to: `0x${string}`; value: bigint } | null = null;
let n = await client.getBlockNumber();
for (let i = 0; i < 20 && !found; i++, n--) {
  const block = await client.getBlock({ blockNumber: n, includeTransactions: true });
  for (const tx of block.transactions) {
    if (tx.to?.toLowerCase() !== USDT.toLowerCase() || !tx.input.startsWith("0xa9059cbb")) continue;
    const { args } = decodeFunctionData({ abi: erc20Abi, data: tx.input });
    const [to, value] = args as [`0x${string}`, bigint];
    if (value > 0n) {
      found = { hash: tx.hash, from: tx.from, to, value };
      break;
    }
  }
}
if (!found) throw new Error("最近 20 个块没有找到直接的 USDT 转账");
const receipt = await client.getTransactionReceipt({ hash: found.hash });
const payer = found.from;
const payTo = found.to;
console.log(`真实交易 ${found.hash}：${payer} → ${payTo}，${Number(found.value) / 1e18} USDT，回执共 ${receipt.logs.length} 条日志`);

let fail = 0;
const expect = (label: string, got: number, want: number) => {
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? "  ok " : "FAIL "} ${label}：${got}（应为 ${want}）`);
};
// 同一笔交易里同一对地址可能有多笔转账，按全部加总后的金额来算。
const total = receipt.logs.length ? paidCount(receipt.logs, { token: USDT, payer, payTo, price: 1n }).paid : 0n;
expect("价格等于实付：记 1 次", paidCount(receipt.logs, { token: USDT, payer, payTo, price: total }).count, 1);
expect("价格是实付的一半：记 2 次", paidCount(receipt.logs, { token: USDT, payer, payTo, price: total / 2n }).count, 2);
expect("价格高于实付：不记", paidCount(receipt.logs, { token: USDT, payer, payTo, price: total + 1n }).count, 0);
expect("付款人不是本人：不记", paidCount(receipt.logs, { token: USDT, payer: "0x000000000000000000000000000000000000bEEF", payTo, price: 1n }).count, 0);
expect("收款地址不对：不记", paidCount(receipt.logs, { token: USDT, payer, payTo: "0x000000000000000000000000000000000000dEaD", price: 1n }).count, 0);
expect("代币不对：不记", paidCount(receipt.logs, { token: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", payer, payTo, price: 1n }).count, 0);
console.log(fail ? `${fail} 项失败` : "全部通过");
process.exit(fail ? 1 : 0);
