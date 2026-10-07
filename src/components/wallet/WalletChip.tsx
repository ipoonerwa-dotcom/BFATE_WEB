"use client";

import Link from "next/link";
import { useWallet } from "./WalletProvider";

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function WalletChip() {
  const w = useWallet();
  if (w.status === "connecting" || w.status === "signing") {
    return <span className="text-[13px] tracking-wider text-ink-3">{w.status === "signing" ? "请在钱包中签名…" : "连接中…"}</span>;
  }
  if (!w.address) {
    return (
      <button
        type="button"
        onClick={w.openPicker}
        className="relative rounded-[3px] border border-cinnabar/70 px-4 py-1.5 text-[13px] tracking-[0.15em] text-cinnabar transition-colors hover:bg-cinnabar hover:text-paper"
      >
        连接钱包
      </button>
    );
  }
  const q = w.quota;
  return (
    <Link href="/me" className="flex items-center gap-2 rounded-[3px] border border-gold/45 bg-[rgba(255,251,240,0.75)] py-1 pl-1 pr-3 text-[12px]">
      <span className={`rounded-[2px] px-2 py-0.5 text-[11px] tracking-wider ${w.wallet === "binance" ? "bg-gold-soft text-[#6d4f17]" : "bg-paper-2 text-ink-2"}`}>
        {w.wallet === "binance" ? `免费 ${q?.freeLeft ?? 0}/${q?.freeLimit ?? 0}` : `额度 ${q?.credits ?? 0}`}
      </span>
      <span className="font-mono-addr text-[12px] text-ink-2">{short(w.address)}</span>
    </Link>
  );
}
