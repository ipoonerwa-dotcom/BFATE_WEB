/* 一次解读的完整流程：命中缓存不扣次数 → 扣免费或付费次数 → 计算 → 存档；出错自动退还次数。 */
import "server-only";
import { randomBytes } from "node:crypto";
import { todayYmd, validBirth, type BirthInput } from "../fate/bazi";
import { birthKey, computeFortune, type FortuneResult } from "../fate/fortune";
import { computeMatch, type MatchResult } from "../fate/match";
import { publicConfig } from "../config";
import { aiEnabled, interpret } from "./ai";
import { kv } from "./kv";
import { getQuota, spend, type Quota } from "./quota";
import type { Session } from "./session";

export type Reading = (FortuneResult | MatchResult) & { id: string; interpretation: string | null; createdAt: number };

export class ReadingError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

export function parseBirth(raw: unknown, label = ""): BirthInput {
  const o = (raw ?? {}) as Record<string, unknown>;
  const hour = o.hour === null || o.hour === undefined || o.hour === "" ? null : Number(o.hour);
  const b: BirthInput = {
    year: Number(o.year),
    month: Number(o.month),
    day: Number(o.day),
    hour,
    gender: o.gender === "female" ? "female" : o.gender === "male" ? "male" : ("" as never),
    name: typeof o.name === "string" ? o.name.slice(0, 12) : undefined,
  };
  const bad = validBirth(b);
  if (bad) throw new ReadingError(`${label}${bad}`, 400);
  return b;
}

const READING_TTL = 90 * 86400;

async function save(s: Session, reading: Reading) {
  await kv().set(`reading:${reading.id}`, reading, { ex: READING_TTL });
  // 归属单独存，分享出去的解读里不带钱包地址。
  await kv().set(`owner:${reading.id}`, s.address.toLowerCase(), { ex: READING_TTL });
  const hk = `hist:${s.address.toLowerCase()}`;
  await kv().lpush(hk, reading.id);
  await kv().ltrim(hk, 0, 49);
  await kv().expire(hk, READING_TTL);
}

async function run(
  s: Session,
  ip: string,
  cacheKey: string,
  compute: () => FortuneResult | MatchResult,
): Promise<{ reading: Reading; via: "cache" | "free" | "credit"; quota: Quota; ai: boolean }> {
  const ai = aiEnabled();
  // 同一个人、同一天的同一件事已经算过：直接给结果，不再扣次数。
  const cachedId = await kv().get<string>(cacheKey);
  if (cachedId) {
    const cached = await kv().get<Reading>(`reading:${cachedId}`);
    if (cached) return { reading: cached, via: "cache", quota: await getQuota(s), ai };
  }

  const paid = await spend(s, ip);
  if (!paid) {
    const quota = await getQuota(s);
    throw new ReadingError(
      quota.freeLimit > 0 ? "今日免费次数已用完" : `本次需支付 ${publicConfig.price} 枚 $${publicConfig.tokenSymbol}`,
      402,
      "payment_required",
    );
  }
  try {
    // 结果立即返回；AI 解读由前端随后单独请求（见 ensureInterpretation），不拖慢出签。
    const result = compute();
    const reading: Reading = { ...result, id: randomBytes(9).toString("base64url"), interpretation: null, createdAt: Date.now() };
    await save(s, reading);
    await kv().set(cacheKey, reading.id, { ex: 36 * 3600 });
    return { reading, via: paid.via, quota: await getQuota(s), ai };
  } catch (e) {
    await paid.refund();
    throw e;
  }
}

export async function readFortune(s: Session, ip: string, birth: BirthInput) {
  const today = todayYmd(publicConfig.timeZone);
  const key = `cache:fortune:${s.address.toLowerCase()}:${today.key}:${birthKey(birth)}`;
  return run(s, ip, key, () => computeFortune(birth, today));
}

export async function readMatch(s: Session, ip: string, a: BirthInput, b: BirthInput) {
  const today = todayYmd(publicConfig.timeZone);
  // 合盘与日期无关，但姻缘 K 线从本月起算，所以按月缓存。
  const pairKey = [birthKey(a) + (a.name ?? ""), birthKey(b) + (b.name ?? "")].sort().join("|");
  const key = `cache:match:${s.address.toLowerCase()}:${today.key.slice(0, 7)}:${pairKey}`;
  return run(s, ip, key, () => computeMatch(a, b, today));
}

/** 为自己的解读生成 AI 细说：每份只生成一次，并发请求用锁挡住。 */
export async function ensureInterpretation(s: Session, id: string): Promise<string | null> {
  const reading = await getReading(id);
  if (!reading) throw new ReadingError("解读不存在或已过期", 404);
  if (reading.interpretation) return reading.interpretation;
  const owner = await kv().get<string>(`owner:${id}`);
  if (owner !== s.address.toLowerCase()) throw new ReadingError("只能为自己的解读生成细说", 403);
  if (!aiEnabled()) return null;
  const lock = await kv().set(`lock:interp:${id}`, 1, { ex: 90, nx: true });
  if (!lock) throw new ReadingError("先生正在落笔，请稍候", 409);
  try {
    const text = await interpret(reading);
    if (text) await kv().set(`reading:${id}`, { ...reading, interpretation: text }, { ex: READING_TTL });
    return text;
  } finally {
    await kv().del(`lock:interp:${id}`);
  }
}

export async function getReading(id: string) {
  if (!/^[A-Za-z0-9_-]{8,20}$/.test(id)) return null;
  return kv().get<Reading>(`reading:${id}`);
}

export async function history(s: Session) {
  const ids = await kv().lrange(`hist:${s.address.toLowerCase()}`, 0, 19);
  const items = await Promise.all(ids.map((id) => kv().get<Reading>(`reading:${id}`)));
  return items
    .filter((r): r is Reading => Boolean(r))
    .map((r) =>
      r.kind === "fortune"
        ? { id: r.id, kind: r.kind, date: r.date, title: `${r.qian.level} · 第${r.qian.no}签`, score: r.overall, createdAt: r.createdAt }
        : { id: r.id, kind: r.kind, date: r.date, title: `${r.a.name} × ${r.b.name} · ${r.title}`, score: r.score, createdAt: r.createdAt },
    );
}
