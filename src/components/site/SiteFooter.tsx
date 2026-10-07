import { Seal } from "@/components/ink/Seal";
import { publicConfig } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-gold/25 px-4 pb-28 pt-10 text-[12px] leading-6 text-ink-3 md:pb-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-3">
          <Seal text="知命" size={34} />
          <div>
            <div className="text-[15px] font-semibold tracking-[0.24em] text-ink-2">BFATE</div>
            <div className="tracking-[0.2em]">今日运势 · 姻缘合盘</div>
          </div>
        </div>
        <div className="max-w-xl space-y-1 md:text-right">
          <p>
            Binance Web3 钱包每日免费 {publicConfig.freeDailyBinance} 次，其他钱包每次 {publicConfig.price} ${publicConfig.tokenSymbol}
            {publicConfig.payTo.toLowerCase() === "0x000000000000000000000000000000000000dead" ? "，支付的代币直接销毁" : ""}。
          </p>
          {publicConfig.token ? (
            <p className="break-all">
              ${publicConfig.tokenSymbol} 合约：<span className="font-mono-addr">{publicConfig.token}</span>
            </p>
          ) : null}
          <p>命理推演基于传统黄历与八字规则，仅供娱乐参考，不构成任何投资或人生决策建议。</p>
        </div>
      </div>
    </footer>
  );
}
