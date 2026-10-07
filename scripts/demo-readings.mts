/* eslint-disable @typescript-eslint/no-explicit-any -- 自测脚本：接口返回的 JSON 按需取字段，不逐个声明类型 */
/* 生成一份示例「今日签」和「姻缘合盘」，打印分享链接，便于预览结果页（本地开发用）。
   用法：npx tsx scripts/demo-readings.mts [http://127.0.0.1:3300] */
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createSiweMessage } from "viem/siwe";

const BASE = process.argv[2] || "http://127.0.0.1:3300";
const account = privateKeyToAccount(generatePrivateKey());
let cookie = "";
async function call(path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const set = res.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  return (await res.json()) as Record<string, any>;
}
const { nonce } = await call("/api/auth/nonce");
const message = createSiweMessage({ domain: new URL(BASE).host, address: account.address, statement: "demo", uri: BASE, version: "1", chainId: 56, nonce, issuedAt: new Date() });
await call("/api/auth/verify", { message, signature: await account.signMessage({ message }), wallet: "binance" });
const f = await call("/api/reading/fortune", { birth: { year: 1995, month: 6, day: 18, hour: 10, gender: "male" } });
const m = await call("/api/reading/match", {
  a: { year: 1995, month: 6, day: 18, hour: 10, gender: "male", name: "阿明" },
  b: { year: 1997, month: 11, day: 3, hour: 8, gender: "female", name: "小雨" },
});
console.log(`${BASE}/r/${f.reading.id}  ${f.reading.qian.level} 第${f.reading.qian.no}签 总${f.reading.overall}`);
console.log(`${BASE}/r/${m.reading.id}  ${m.reading.title} ${m.reading.score}`);
