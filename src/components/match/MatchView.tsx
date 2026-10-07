"use client";

import type { ReactNode } from "react";
import { KLineChart } from "@/components/charts/KLineChart";
import { Radar } from "@/components/charts/Score";
import { BaziCard } from "@/components/fortune/BaziCard";
import { Seal } from "@/components/ink/Seal";
import type { MatchReading } from "@/lib/client/api";

/** 两枚名章之间牵一根红线，中间打一个同心结。drawing 时红线一笔一笔牵过去。 */
export function RedThread({ a, b, drawing = true }: { a: string; b: string; drawing?: boolean }) {
  return (
    <div className="relative mx-auto flex max-w-md items-center justify-between px-1">
      <div className="z-10 w-[76px] text-center">
        <Seal text={[...a][0] ?? "你"} size={62} rotate={-4} />
        <div className="mt-1.5 truncate text-[13px] tracking-wider text-ink-2">{a}</div>
      </div>
      <svg className="absolute inset-x-[64px] top-0 h-[70px]" viewBox="0 0 240 70" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M 2 30 C 40 62, 80 62, 104 36 M 136 36 C 160 62, 200 62, 238 30"
          fill="none"
          stroke="#b8291f"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeDasharray="200"
          strokeDashoffset={drawing ? 200 : 0}
          style={drawing ? { animation: "draw-line 1.6s ease-in-out forwards" } : undefined}
        />
        <path d="M 2 30 C 40 62, 80 62, 104 36 M 136 36 C 160 62, 200 62, 238 30" fill="none" stroke="#ff9a7f" strokeWidth="0.7" strokeOpacity="0.5" strokeLinecap="round" />
      </svg>
      {/* 同心结 */}
      <svg
        className={`absolute left-1/2 top-[6px] h-[60px] w-[60px] -translate-x-1/2 ${drawing ? "anim-knot" : ""}`}
        viewBox="0 0 64 64"
        aria-hidden="true"
      >
        <path
          d="M32 20 C 25 12, 14 16, 17 24 C 20 32, 32 36, 32 42 C 32 36, 44 32, 47 24 C 50 16, 39 12, 32 20 Z"
          fill="#b8291f"
          fillOpacity="0.14"
          stroke="#b8291f"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path d="M32 20 L 32 30 M 26 25 L 38 25" stroke="#b8291f" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        <path d="M32 42 C 30 50, 27 54, 24 60 M32 42 C 34 50, 37 54, 40 60" stroke="#b8291f" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
      <div className="z-10 w-[76px] text-center">
        <Seal text={[...b][0] ?? "他"} size={62} rotate={5} />
        <div className="mt-1.5 truncate text-[13px] tracking-wider text-ink-2">{b}</div>
      </div>
    </div>
  );
}

export function MatchView({ r, interpretation }: { r: MatchReading; interpretation?: ReactNode }) {
  return (
    <div className="space-y-6">
      <section className="panel relative overflow-hidden px-6 pb-9 pt-8 text-center md:px-10">
        <RedThread a={r.a.name} b={r.b.name} drawing={false} />
        <div className="mt-7 text-[12px] tracking-[0.5em] text-ink-3">缘 分 指 数</div>
        <div className="ink-text mt-1 font-brush text-[96px] leading-none text-cinnabar">{r.score}</div>
        <h2 className="ink-text anim-ink-in mt-3 font-brush text-[38px] tracking-[0.22em]">{r.title}</h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-8 text-ink-2">{r.summary}</p>
      </section>

      {interpretation ??
        (r.interpretation ? (
          <section className="panel p-6 md:p-8">
            <h3 className="panel-title">先生细说</h3>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-8 text-ink-2">{r.interpretation}</p>
          </section>
        ) : null)}

      <section className="grid gap-6 md:grid-cols-2">
        <div className="panel p-6 md:p-8">
          <h3 className="panel-title mb-2">合盘五维</h3>
          <Radar dims={r.dims} />
        </div>
        <div className="panel p-6 md:p-8">
          <h3 className="panel-title mb-4">命盘细节</h3>
          <ul className="space-y-3 text-[15px] leading-7 text-ink-2">
            {r.notes.length ? (
              r.notes.map((n) => (
                <li key={n} className="flex gap-3">
                  <i className="mt-[11px] h-1.5 w-1.5 shrink-0 rotate-45 bg-cinnabar" />
                  {n}
                </li>
              ))
            ) : (
              <li>两人命盘没有明显的合冲，属于细水长流的组合，感情要靠日常一点一滴积累。</li>
            )}
          </ul>
        </div>
      </section>

      <section className="panel p-5 md:p-8">
        <div className="mb-3 flex items-baseline gap-3">
          <h3 className="panel-title flex-1">未来十二月 · 姻缘 K 线</h3>
          <span className="hidden shrink-0 text-[12px] tracking-widest text-ink-3 sm:inline">红涨绿跌</span>
        </div>
        <KLineChart candles={r.months} highlight={[r.bestMonth]} caption={`${r.bestMonth}最旺，${r.worstMonth}宜多包容`} />
        <p className="mt-4 rounded-[3px] border border-gold/30 bg-[rgba(255,250,238,0.7)] px-4 py-3 text-[15px] leading-8 text-ink-2">{r.advice}</p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="panel p-6 md:p-8">
          <BaziCard bazi={r.a.bazi} title={`${r.a.name}的八字`} />
        </div>
        <div className="panel p-6 md:p-8">
          <BaziCard bazi={r.b.bazi} title={`${r.b.name}的八字`} />
        </div>
      </section>
    </div>
  );
}
