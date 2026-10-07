/* 次数：币安 Web3 钱包每日免费 N 次（北京时间零点重置）；付费额度按笔累积，用一次扣一次。 */
import "server-only";
import { todayYmd } from "../fate/bazi";
import { publicConfig, serverConfig } from "../config";
import { kv } from "./kv";
import type { Session } from "./session";

export interface Quota {
  freeLimit: number;
  freeUsed: number;
  freeLeft: number;
  credits: number;
}

const freeKey = (addr: string, day: string) => `free:${addr.toLowerCase()}:${day}`;
const ipKey = (ip: string, day: string) => `freeip:${ip}:${day}`;
const creditKey = (addr: string) => `credits:${addr.toLowerCase()}`;

export const freeLimitFor = (s: Session) => (s.wallet === "binance" ? publicConfig.freeDailyBinance : publicConfig.freeDailyOther);

export async function getQuota(s: Session): Promise<Quota> {
  const day = todayYmd(publicConfig.timeZone).key;
  const [used, credits] = await Promise.all([kv().get<number>(freeKey(s.address, day)), kv().get<number>(creditKey(s.address))]);
  const freeLimit = freeLimitFor(s);
  const freeUsed = Math.min(Number(used ?? 0), freeLimit);
  return { freeLimit, freeUsed, freeLeft: Math.max(0, freeLimit - freeUsed), credits: Math.max(0, Number(credits ?? 0)) };
}

export type Spend = { via: "free" | "credit"; refund: () => Promise<void> };

/** 先用免费次数，再用付费额度；都没有返回 null。拿到的 refund 用于生成失败时退还。 */
export async function spend(s: Session, ip: string): Promise<Spend | null> {
  const day = todayYmd(publicConfig.timeZone).key;
  const limit = freeLimitFor(s);
  if (limit > 0) {
    const fk = freeKey(s.address, day);
    const used = await kv().incrby(fk, 1);
    await kv().expire(fk, 2 * 86400);
    if (used <= limit) {
      const ik = ipKey(ip, day);
      const perIp = await kv().incrby(ik, 1);
      await kv().expire(ik, 2 * 86400);
      if (perIp <= serverConfig().freePerIpDaily) {
        return {
          via: "free",
          refund: async () => {
            await kv().incrby(fk, -1);
            await kv().incrby(ik, -1);
          },
        };
      }
      await kv().incrby(ik, -1);
    }
    await kv().incrby(fk, -1);
  }
  const ck = creditKey(s.address);
  const left = await kv().incrby(ck, -1);
  if (left >= 0) return { via: "credit", refund: async () => void (await kv().incrby(ck, 1)) };
  await kv().incrby(ck, 1);
  return null;
}

export async function addCredits(address: string, n: number) {
  return kv().incrby(creditKey(address), n);
}
