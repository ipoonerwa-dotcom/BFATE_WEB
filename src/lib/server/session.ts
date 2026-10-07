/* 钱包登录：用户签一条 SIWE 消息（不花 gas）证明地址归属，服务端发一个签名 Cookie。 */
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { getAddress } from "viem";
import { generateSiweNonce, parseSiweMessage } from "viem/siwe";
import { serverConfig } from "../config";
import { chainClient } from "./chain";
import { kv } from "./kv";

export type WalletKind = "binance" | "other";

export interface Session {
  address: `0x${string}`;
  wallet: WalletKind;
  exp: number;
}

const COOKIE = "bfate_session";
const TTL_SECONDS = 7 * 24 * 3600;

function secret() {
  const s = serverConfig().sessionSecret;
  if (s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET 至少 32 个字符");
  return "dev-only-session-secret-change-me-0000";
}

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

function encode(s: Session) {
  const payload = b64(JSON.stringify(s));
  return `${payload}.${sign(payload)}`;
}

function decode(token: string | undefined): Session | null {
  if (!token) return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;
  const expected = sign(payload);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    return s.exp > Date.now() / 1000 ? s : null;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  return decode((await cookies()).get(COOKIE)?.value);
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function newNonce() {
  const nonce = generateSiweNonce();
  await kv().set(`nonce:${nonce}`, 1, { ex: 600 });
  return nonce;
}

/** 校验签名并建立会话。wallet 由前端按实际连接的钱包上报。 */
export async function verifyLogin(message: string, signature: `0x${string}`, wallet: WalletKind): Promise<Session> {
  const fields = parseSiweMessage(message);
  if (!fields.address || !fields.nonce || !fields.domain) throw new Error("签名消息格式不正确");
  const host = (await headers()).get("host");
  if (host && fields.domain !== host) throw new Error("签名消息的域名与当前网站不一致");
  // 一次性随机数：用过即删，防重放。
  const fresh = await kv().get(`nonce:${fields.nonce}`);
  if (!fresh) throw new Error("签名已过期，请重新连接");
  await kv().del(`nonce:${fields.nonce}`);
  const ok = await chainClient().verifySiweMessage({ message, signature, domain: fields.domain, nonce: fields.nonce });
  if (!ok) throw new Error("签名校验失败");

  const session: Session = {
    address: getAddress(fields.address),
    wallet: wallet === "binance" ? "binance" : "other",
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  (await cookies()).set(COOKIE, encode(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_SECONDS,
  });
  return session;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for") || h.get("x-real-ip") || "0.0.0.0").split(",")[0].trim();
}
