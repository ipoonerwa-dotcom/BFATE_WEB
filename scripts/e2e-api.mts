/* eslint-disable @typescript-eslint/no-explicit-any -- 自测脚本：接口返回的 JSON 按需取字段，不逐个声明类型 */
/* 后端流程自测：用一次性生成的测试私钥签名登录，走完免费次数、缓存不计次、额度用尽 402、分享与历史。
   用法：先 npm run dev -- -p 3300，再 npx tsx scripts/e2e-api.mts [http://127.0.0.1:3300] */
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createSiweMessage } from "viem/siwe";

const BASE = process.argv[2] || "http://127.0.0.1:3300";
const host = new URL(BASE).host;
let failures = 0;
const check = (cond: unknown, label: string) => {
  console.log(`${cond ? "  ok " : "FAIL "} ${label}`);
  if (!cond) failures++;
};

async function client(wallet: "binance" | "other") {
  const account = privateKeyToAccount(generatePrivateKey());
  let cookie = "";
  const call = async (path: string, body?: unknown) => {
    const res = await fetch(BASE + path, {
      method: body === undefined ? "GET" : "POST",
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    return { status: res.status, data: (await res.json().catch(() => ({}))) as Record<string, any> };
  };
  const { data: n } = await call("/api/auth/nonce");
  const message = createSiweMessage({
    domain: host,
    address: account.address,
    statement: "登录 BFATE（自测）",
    uri: BASE,
    version: "1",
    chainId: 56,
    nonce: n.nonce,
    issuedAt: new Date(),
  });
  const signature = await account.signMessage({ message });
  const v = await call("/api/auth/verify", { message, signature, wallet });
  // 同一个 nonce 不能用第二次。
  const replay = await call("/api/auth/verify", { message, signature, wallet });
  return { account, call, v, replay };
}

const birth = (day: number) => ({ year: 1995, month: 6, day, hour: 10, gender: "male" });

console.log("— 币安钱包用户 —");
const b = await client("binance");
check(b.v.status === 200 && b.v.data.wallet === "binance", `签名登录成功（${b.v.status}）`);
check(b.replay.status === 400, `同一签名重放被拒（${b.replay.status}）`);
const me = await b.call("/api/me");
check(me.data.quota?.freeLimit === 5 && me.data.quota?.freeLeft === 5, `每日免费 5 次：${JSON.stringify(me.data.quota)}`);

const r1 = await b.call("/api/reading/fortune", { birth: birth(1) });
check(r1.status === 200 && r1.data.via === "free", `第 1 次求签走免费（${r1.status} ${r1.data.via}）`);
check(r1.data.reading?.qian?.poem?.length === 4 && r1.data.reading.hours.length === 12, "结果含 4 句签诗与 12 根时辰 K 线");
const r1b = await b.call("/api/reading/fortune", { birth: birth(1) });
check(r1b.data.via === "cache" && r1b.data.reading.id === r1.data.reading.id, "同一生辰再看一次：命中缓存、不计次");
check(r1b.data.quota.freeLeft === 4, `剩余免费 ${r1b.data.quota.freeLeft}（应为 4）`);

for (let d = 2; d <= 5; d++) await b.call("/api/reading/fortune", { birth: birth(d) });
const r6 = await b.call("/api/reading/fortune", { birth: birth(6) });
check(r6.status === 402 && r6.data.code === "payment_required", `第 6 次：免费用完返回 402（${r6.status} ${r6.data.error}）`);
const m1 = await b.call("/api/reading/match", { a: birth(1), b: { year: 1997, month: 11, day: 3, hour: null, gender: "female", name: "小红" } });
check(m1.status === 402, `免费用完后合盘同样需要付费（${m1.status}）`);
const bad = await b.call("/api/reading/fortune", { birth: { year: 1995, month: 2, day: 30, hour: null, gender: "male" } });
check(bad.status === 400, `非法日期 2 月 30 日被拒（${bad.status} ${bad.data.error}）`);

const shared = await fetch(`${BASE}/api/reading/${r1.data.reading.id}`);
const sharedData = (await shared.json()) as Record<string, any>;
check(shared.status === 200 && !JSON.stringify(sharedData).includes(b.account.address), "分享链接可公开读取，且不含钱包地址");
const hist = await b.call("/api/history");
check(hist.data.items?.length === 5, `历史记录 ${hist.data.items?.length} 条（应为 5）`);
const pageRes = await fetch(`${BASE}/r/${r1.data.reading.id}`);
check(pageRes.status === 200, `分享页 /r/[id] 可打开（${pageRes.status}）`);

const mine = await b.call(`/api/reading/${r1.data.reading.id}/interpret`, {});
check(mine.status === 200 && "interpretation" in mine.data, `本人请求 AI 细说（${mine.status}，未配置密钥时为 null：${JSON.stringify(mine.data.interpretation)?.slice(0, 40)}）`);

console.log("— 其他钱包用户 —");
const o = await client("other");
const notMine = await o.call(`/api/reading/${r1.data.reading.id}/interpret`, {});
check(notMine.status === 403 || (notMine.status === 200 && mine.data.interpretation), `别人不能为他人的解读生成细说（${notMine.status}）`);
check(o.v.status === 200 && o.v.data.quota.freeLimit === 0, `其他钱包无免费次数（${JSON.stringify(o.v.data.quota)}）`);
const o1 = await o.call("/api/reading/match", { a: birth(1), b: { year: 1997, month: 11, day: 3, hour: null, gender: "female" } });
check(o1.status === 402, `其他钱包直接要求付费（${o1.status} ${o1.data.error}）`);
const pay = await o.call("/api/pay/verify", { txHash: "0x" + "ab".repeat(32) });
check(pay.status === 503 || pay.status === 425 || pay.status === 400, `代币未配置/假交易时付款核验不会加额度（${pay.status} ${pay.data.error}）`);

console.log("— 未登录 —");
const anon = await fetch(`${BASE}/api/reading/fortune`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ birth: birth(1) }) });
check(anon.status === 401, `未登录调用解读被拒（${anon.status}）`);

console.log(failures ? `\n${failures} 项失败` : "\n全部通过");
process.exit(failures ? 1 : 0);
