"use client";

import { useState } from "react";
import { ApiError } from "@/lib/client/api";
import { useWallet } from "./WalletProvider";

/* 次数状态条：告诉用户这一次是免费、用额度，还是要付费；需要付费时把付款流程也放在这里。 */
export function AccessGate({ compact = false }: { compact?: boolean }) {
  const w = useWallet();
  const [stage, setStage] = useState<"idle" | "sign" | "confirm" | "verify">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const q = w.quota;

  if (!w.address) {
    return (
      <div className="relative overflow-hidden rounded-[3px] border border-gold/50 bg-[linear-gradient(135deg,rgba(243,231,201,0.92),rgba(236,219,178,0.85))] px-4 py-3.5 text-[13px] leading-6 text-ink-2">
        <div className="absolute inset-0 bg-[url(/art/gold.webp)] bg-[length:380px] opacity-60" aria-hidden="true" />
        <div className="relative">
          <b className="font-semibold text-[#6d4f17]">Binance Web3 钱包每日免费 {w.config.freeDailyBinance} 次</b>
          <span>，其他钱包每次 {w.config.price} ${w.config.tokenSymbol}。</span>
          <button type="button" onClick={w.openPicker} className="ml-1 text-cinnabar underline decoration-cinnabar/40 underline-offset-[5px]">
            连接钱包
          </button>
        </div>
      </div>
    );
  }

  const free = q?.freeLeft ?? 0;
  const credits = q?.credits ?? 0;
  if (free > 0 || credits > 0) {
    return (
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-2 ${compact ? "" : "cell px-4 py-3"}`}>
        {free > 0 ? (
          <span>
            今日免费剩余 <b className="font-brush text-[20px] font-normal text-cinnabar">{free}</b> / {q?.freeLimit} 次
          </span>
        ) : null}
        {credits > 0 ? (
          <span>
            已购次数 <b className="font-brush text-[20px] font-normal text-cinnabar">{credits}</b>
          </span>
        ) : null}
      </div>
    );
  }

  const busy = stage !== "idle";
  const label = { idle: `支付 ${w.config.price} $${w.config.tokenSymbol} 解锁一次`, sign: "请在钱包中确认付款…", confirm: "等待链上确认…", verify: "核对付款中…" }[stage];
  return (
    <div className="space-y-2.5 rounded-[3px] border border-cinnabar/30 bg-[rgba(241,220,207,0.55)] px-4 py-3.5 text-[13px] leading-6 text-ink-2">
      <p>
        {w.wallet === "binance" && (q?.freeLimit ?? 0) > 0 ? "今日免费次数已用完，" : ""}
        本次需支付 <b className="font-semibold text-ink">{w.config.price} ${w.config.tokenSymbol}</b>
        {w.config.payTo.toLowerCase() === "0x000000000000000000000000000000000000dead" ? "（直接销毁）" : ""}。
        {w.wallet !== "binance" ? " 用 Binance Web3 钱包连接可每日免费。" : ""}
      </p>
      {w.config.token ? (
        <button
          type="button"
          className="btn-seal w-full !min-h-11 !text-lg"
          disabled={busy}
          onClick={async () => {
            setMsg(null);
            try {
              await w.pay((s) => setStage(s));
              setMsg("付款成功，已为你记入 1 次");
            } catch (e) {
              const code = (e as { code?: number }).code;
              setMsg(code === 4001 ? "你取消了付款" : e instanceof ApiError || e instanceof Error ? e.message.split("\n")[0] : "付款失败");
            } finally {
              setStage("idle");
            }
          }}
        >
          {label}
        </button>
      ) : (
        <p className="text-ink-3">付费通道即将开放（代币地址公布后自动启用）。</p>
      )}
      {msg ? <p className={msg.startsWith("付款成功") ? "text-jade" : "text-cinnabar"}>{msg}</p> : null}
    </div>
  );
}
