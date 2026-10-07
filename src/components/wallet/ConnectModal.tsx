"use client";

import { useState } from "react";
import { useWallet } from "./WalletProvider";

/* 选择钱包：币安 Web3 钱包排在第一位并标注免费；一个钱包都没检测到时，教用户去币安 App 里打开。 */
export function ConnectModal() {
  const w = useWallet();
  const [copied, setCopied] = useState(false);
  if (!w.pickerOpen) return null;

  const busy = w.status === "connecting" || w.status === "signing";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(27,23,20,0.42)] backdrop-blur-[3px] md:items-center" onClick={w.closePicker}>
      <div
        className="panel anim-ink-in w-full max-w-md rounded-b-none px-6 pb-7 pt-6 md:rounded-[3px]"
        style={{ paddingBottom: "max(1.75rem, env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="连接钱包"
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="panel-title flex-1 !text-[24px]">连接钱包</h2>
          <button type="button" onClick={w.closePicker} className="ml-3 h-9 w-9 rounded-full text-xl text-ink-3 hover:bg-ink/5" aria-label="关闭">
            ×
          </button>
        </div>
        <p className="mb-5 text-[13px] leading-6 text-ink-3">
          连接后需签名一次以确认钱包归属，<b className="font-semibold text-ink-2">不会发起交易、不花 gas</b>。Binance Web3 钱包每日免费 {w.config.freeDailyBinance} 次，其他钱包每次{" "}
          {w.config.price} ${w.config.tokenSymbol}。
        </p>

        {w.options.length > 0 ? (
          <ul className="space-y-2.5">
            {w.options.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void w.connect(o)}
                  className={`relative flex w-full items-center gap-3 overflow-hidden rounded-[3px] border px-4 py-3 text-left transition-colors disabled:opacity-60 ${
                    o.isBinance ? "border-gold/60 bg-[linear-gradient(135deg,rgba(243,231,201,0.95),rgba(236,219,178,0.9))]" : "border-ink/15 bg-[rgba(255,252,243,0.7)] hover:bg-[rgba(255,252,243,0.95)]"
                  }`}
                >
                  {o.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={o.icon} alt="" className="h-9 w-9 rounded-lg" />
                  ) : (
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink/10 text-sm">{o.name[0]}</span>
                  )}
                  <span className="flex-1 text-[15px] text-ink">{o.name}</span>
                  {o.isBinance ? (
                    <span className="rounded-[2px] bg-cinnabar px-2 py-0.5 text-[11px] tracking-wider text-paper">每日免费 {w.config.freeDailyBinance} 次</span>
                  ) : (
                    <span className="text-[12px] text-ink-3">
                      {w.config.price} ${w.config.tokenSymbol}/次
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-[3px] border border-dashed border-gold/50 bg-[rgba(255,250,238,0.6)] p-4 text-[13px] leading-6 text-ink-2">
            <p className="mb-2 text-ink">没有检测到钱包。推荐在币安 App 中打开，可每日免费使用：</p>
            <ol className="mb-3 list-decimal space-y-1 pl-5">
              <li>打开币安 App，切换到「Web3 钱包」</li>
              <li>点击「发现 / 浏览器」，粘贴本站网址</li>
            </ol>
            <button
              type="button"
              className="btn-ink w-full !min-h-11 !text-base"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? "已复制网址" : "复制本站网址"}
            </button>
          </div>
        )}

        {busy ? <p className="mt-4 text-center text-[13px] tracking-wider text-ink-3">{w.status === "signing" ? "请在钱包中确认签名…" : "正在连接…"}</p> : null}
        {w.error ? <p className="mt-4 text-center text-[13px] text-cinnabar">{w.error}</p> : null}
      </div>
    </div>
  );
}
