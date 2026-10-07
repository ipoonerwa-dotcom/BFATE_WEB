"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Seal } from "@/components/ink/Seal";
import { AccessGate } from "@/components/wallet/AccessGate";
import { short } from "@/components/wallet/WalletChip";
import { useWallet } from "@/components/wallet/WalletProvider";
import { api } from "@/lib/client/api";

type Item = Awaited<ReturnType<typeof api.history>>["items"][number];

export default function MePage() {
  const w = useWallet();
  /** 按地址记下的历史：换了地址就自然显示「读取中」，不必在 effect 里清空。 */
  const [loadedFor, setLoadedFor] = useState<{ address: string; items: Item[] } | null>(null);
  const items = w.address && loadedFor?.address === w.address ? loadedFor.items : null;

  useEffect(() => {
    const address = w.address;
    if (!address) return;
    let alive = true;
    api
      .history()
      .then((r) => alive && setLoadedFor({ address, items: r.items }))
      .catch(() => alive && setLoadedFor({ address, items: [] }));
    return () => {
      alive = false;
    };
  }, [w.address]);

  if (!w.address) {
    return (
      <div className="mx-auto max-w-md px-4 pb-20 pt-12 text-center">
        <h1 className="ink-text font-brush text-[46px] tracking-[0.22em]">我的</h1>
        <div className="panel mt-6 px-6 py-8">
          <Seal text="知命" size={52} className="mx-auto" />
          <p className="mt-5 text-[15px] leading-7 text-ink-2">连接钱包后可查看今日次数与历史解读。</p>
          <button type="button" className="btn-seal mt-6 w-full" onClick={w.openPicker}>
            连接钱包
          </button>
        </div>
      </div>
    );
  }

  const q = w.quota;
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-20 pt-8">
      <h1 className="ink-text text-center font-brush text-[46px] tracking-[0.22em]">我的</h1>

      <section className="panel p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono-addr text-[15px] text-ink">{short(w.address)}</span>
          <span className={`rounded-[2px] px-2.5 py-0.5 text-[12px] tracking-wider ${w.wallet === "binance" ? "bg-gold-soft text-[#6d4f17]" : "bg-paper-2 text-ink-2"}`}>
            {w.wallet === "binance" ? "Binance Web3 钱包" : "其他钱包"}
          </span>
          <button type="button" onClick={() => void w.logout()} className="ml-auto text-[13px] tracking-widest text-ink-3 underline underline-offset-4">
            退出
          </button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 text-center">
          <div className="cell py-5">
            <div className="ink-text font-brush text-[46px] leading-none text-cinnabar">
              {q?.freeLeft ?? 0}
              <span className="text-[24px] text-ink-3">/{q?.freeLimit ?? 0}</span>
            </div>
            <div className="mt-2 text-[12px] tracking-[0.25em] text-ink-3">今日免费次数</div>
          </div>
          <div className="cell py-5">
            <div className="ink-text font-brush text-[46px] leading-none text-ink">{q?.credits ?? 0}</div>
            <div className="mt-2 text-[12px] tracking-[0.25em] text-ink-3">已购次数</div>
          </div>
        </div>
        {w.wallet !== "binance" ? (
          <p className="mt-5 text-[13px] leading-6 text-ink-3">提示：在币安 App 的 Web3 钱包里打开本站并用它连接，每日可免费 {w.config.freeDailyBinance} 次。</p>
        ) : null}
      </section>

      <AccessGate />

      <section className="panel p-6 md:p-8">
        <h2 className="panel-title">历史解读</h2>
        {items === null ? (
          <p className="mt-4 text-[13px] tracking-wider text-ink-3">读取中…</p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-[14px] text-ink-3">
            还没有记录。去
            <Link href="/fortune" className="mx-1 text-cinnabar underline decoration-cinnabar/40 underline-offset-[5px]">
              求一支今日签
            </Link>
            吧。
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-gold/20">
            {items.map((it) => (
              <li key={it.id}>
                <Link href={`/r/${it.id}`} className="group flex items-center gap-4 py-3.5">
                  <Seal text={it.kind === "fortune" ? "签" : "缘"} size={40} rotate={it.kind === "fortune" ? -4 : 4} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-ink group-hover:text-cinnabar">{it.title}</span>
                    <span className="text-[12px] tracking-wider text-ink-3">{it.date}</span>
                  </span>
                  <span className="ink-text font-brush text-[28px] text-cinnabar">{it.score}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
