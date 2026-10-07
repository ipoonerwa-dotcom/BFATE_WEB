/* 前端调用后端接口的薄封装：统一解析错误信息。 */
import type { FortuneResult } from "@/lib/fate/fortune";
import type { MatchResult } from "@/lib/fate/match";

export interface Quota {
  freeLimit: number;
  freeUsed: number;
  freeLeft: number;
  credits: number;
}

export type Reading = (FortuneResult | MatchResult) & { id: string; interpretation: string | null; createdAt: number };
export type FortuneReading = FortuneResult & { id: string; interpretation: string | null; createdAt: number };
export type MatchReading = MatchResult & { id: string; interpretation: string | null; createdAt: number };

export interface BirthPayload {
  year: number;
  month: number;
  day: number;
  hour: number | null;
  gender: "male" | "female";
  name?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; code?: string };
  if (!res.ok) throw new ApiError(data.error || `请求失败（${res.status}）`, res.status, data.code);
  return data;
}

export const api = {
  me: () => call<{ session: { address: `0x${string}`; wallet: "binance" | "other" } | null; quota?: Quota }>("/api/me"),
  nonce: () => call<{ nonce: string }>("/api/auth/nonce"),
  verify: (message: string, signature: string, wallet: "binance" | "other") =>
    call<{ address: `0x${string}`; wallet: "binance" | "other"; quota: Quota }>("/api/auth/verify", {
      method: "POST",
      body: JSON.stringify({ message, signature, wallet }),
    }),
  logout: () => call<{ ok: true }>("/api/auth/logout", { method: "POST" }),
  payVerify: (txHash: string) => call<{ added: number; credits: number; quota: Quota }>("/api/pay/verify", { method: "POST", body: JSON.stringify({ txHash }) }),
  fortune: (birth: BirthPayload) =>
    call<{ reading: FortuneReading; via: "cache" | "free" | "credit"; quota: Quota; ai: boolean }>("/api/reading/fortune", {
      method: "POST",
      body: JSON.stringify({ birth }),
    }),
  match: (a: BirthPayload, b: BirthPayload) =>
    call<{ reading: MatchReading; via: "cache" | "free" | "credit"; quota: Quota; ai: boolean }>("/api/reading/match", {
      method: "POST",
      body: JSON.stringify({ a, b }),
    }),
  interpret: (id: string) => call<{ interpretation: string | null }>(`/api/reading/${encodeURIComponent(id)}/interpret`, { method: "POST" }),
  history: () =>
    call<{ items: { id: string; kind: "fortune" | "match"; date: string; title: string; score: number; createdAt: number }[] }>("/api/history"),
};
