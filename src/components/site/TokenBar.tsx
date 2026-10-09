"use client";

import { useState } from "react";
import { XLogo } from "@/components/site/XLink";
import { publicConfig } from "@/lib/config";

const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** 首屏代币信息条：合约地址（点一下复制）、DexScreener 行情、官方 X。 */
export function TokenBar({ className = "" }: { className?: string }) {
  const token = publicConfig.token;
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
    } catch {
      // 少数内置浏览器不给剪贴板权限：退回到选中文本 + execCommand
      const el = document.createElement("textarea");
      el.value = token;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const pill =
    "inline-flex h-9 items-center gap-2 rounded-[3px] border border-gold/45 bg-[rgba(255,251,240,0.8)] px-3 text-[13px] text-ink-2 shadow-[0_6px_16px_-12px_rgba(90,60,20,0.5)] backdrop-blur-[3px] transition-colors";

  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
      {token ? (
        <>
          <button type="button" onClick={() => void copy()} className={`${pill} hover:border-ink/50`} title={token} aria-label={`复制合约地址 ${token}`}>
            <span className="text-[12px] tracking-wider text-ink-3">CA</span>
            <span className="font-mono-addr text-[13px] text-ink">{shortAddr(token)}</span>
            <span className={`text-[12px] ${copied ? "text-jade" : "text-cinnabar"}`}>{copied ? "已复制 ✓" : "复制"}</span>
          </button>
          <a href={`https://dexscreener.com/bsc/${token}`} target="_blank" rel="noopener noreferrer" className={`${pill} hover:border-ink/50 hover:text-ink`}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 3v18h18" />
              <path d="M7 15l4-5 3 3 5-7" />
            </svg>
            DexScreener<span className="hidden sm:inline"> 行情</span>
            <span aria-hidden="true">↗</span>
          </a>
        </>
      ) : null}
      <a href={publicConfig.xUrl} target="_blank" rel="noopener noreferrer" className={`${pill} hover:border-ink/50 hover:text-ink`}>
        <XLogo size={13} />
        {publicConfig.xHandle}
      </a>
    </div>
  );
}
