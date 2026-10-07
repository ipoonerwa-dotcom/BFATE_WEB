/* 键值存储：线上用 Upstash Redis（Vercel 市场一键接入）；本地开发没有配置时退回内存。 */
import "server-only";
import { Redis } from "@upstash/redis";

export interface KV {
  get<T>(key: string): Promise<T | null>;
  /** nx=true 时只在键不存在时写入；返回是否写入。 */
  set(key: string, value: unknown, opts?: { ex?: number; nx?: boolean }): Promise<boolean>;
  del(key: string): Promise<void>;
  incrby(key: string, n: number): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  lpush(key: string, value: string): Promise<void>;
  ltrim(key: string, start: number, stop: number): Promise<void>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
}

function upstash(): KV | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const r = new Redis({ url, token });
  return {
    get: (k) => r.get(k),
    async set(k, v, o) {
      const opts = o?.ex ? (o.nx ? { ex: o.ex, nx: true as const } : { ex: o.ex }) : o?.nx ? { nx: true as const } : undefined;
      const res = await r.set(k, v, opts as never);
      return res === "OK";
    },
    async del(k) {
      await r.del(k);
    },
    incrby: (k, n) => r.incrby(k, n),
    async expire(k, s) {
      await r.expire(k, s);
    },
    async lpush(k, v) {
      await r.lpush(k, v);
    },
    async ltrim(k, a, b) {
      await r.ltrim(k, a, b);
    },
    lrange: (k, a, b) => r.lrange<string>(k, a, b),
  };
}

type Entry = { v: unknown; exp: number | null };
const g = globalThis as unknown as { __bfateMem?: Map<string, Entry> };

function memory(): KV {
  const m = (g.__bfateMem ??= new Map<string, Entry>());
  const live = (k: string) => {
    const e = m.get(k);
    if (!e) return null;
    if (e.exp !== null && e.exp < Date.now()) {
      m.delete(k);
      return null;
    }
    return e;
  };
  return {
    async get<T>(k: string) {
      return (live(k)?.v as T) ?? null;
    },
    async set(k, v, o) {
      if (o?.nx && live(k)) return false;
      m.set(k, { v, exp: o?.ex ? Date.now() + o.ex * 1000 : null });
      return true;
    },
    async del(k) {
      m.delete(k);
    },
    async incrby(k, n) {
      const e = live(k);
      const next = Number(e?.v ?? 0) + n;
      m.set(k, { v: next, exp: e?.exp ?? null });
      return next;
    },
    async expire(k, s) {
      const e = live(k);
      if (e) e.exp = Date.now() + s * 1000;
    },
    async lpush(k, v) {
      const e = live(k);
      const list = Array.isArray(e?.v) ? (e!.v as string[]) : [];
      m.set(k, { v: [v, ...list], exp: e?.exp ?? null });
    },
    async ltrim(k, a, b) {
      const e = live(k);
      if (e && Array.isArray(e.v)) e.v = (e.v as string[]).slice(a, b + 1);
    },
    async lrange(k, a, b) {
      const e = live(k);
      return Array.isArray(e?.v) ? (e!.v as string[]).slice(a, b + 1) : [];
    },
  };
}

let cached: KV | null = null;
export function kv(): KV {
  if (cached) return cached;
  const remote = upstash();
  if (!remote && process.env.NODE_ENV === "production" && !process.env.ALLOW_MEMORY_KV) {
    throw new Error("线上环境必须配置 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN（或 Vercel KV）");
  }
  cached = remote ?? memory();
  return cached;
}
