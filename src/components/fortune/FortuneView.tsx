"use client";

import type { ReactNode } from "react";
import { KLineChart } from "@/components/charts/KLineChart";
import { DimBars, ScoreDial } from "@/components/charts/Score";
import { Seal } from "@/components/ink/Seal";
import type { FortuneReading } from "@/lib/client/api";
import { BaziCard } from "./BaziCard";
import { QianScroll } from "./QianScroll";

export function FortuneView({ r, interpretation, animate = true }: { r: FortuneReading; interpretation?: ReactNode; animate?: boolean }) {
  return (
    <div className="space-y-6">
      <section className="panel px-5 pb-7 pt-8 md:px-9 md:pb-10 md:pt-10">
        <div className="grid gap-9 md:grid-cols-[300px_1fr] md:items-start md:gap-10">
          <QianScroll qian={r.qian} date={r.date} animate={animate} />

          <div>
            <div className="flex items-center gap-4 md:gap-5">
              <ScoreDial score={r.overall} label="今日运势" className="w-[118px] md:w-[148px]" />
              <div className="min-w-0">
                <p className="text-[12px] leading-5 tracking-[0.08em] text-ink-3">
                  {r.date}
                  <br />
                  农历{r.almanac.lunar} · {r.almanac.dayGanZhi}日
                </p>
                <h2 className="ink-text mt-2 font-brush text-[22px] leading-[1.3] tracking-wide text-cinnabar md:text-[32px] md:tracking-wider">
                  {r.theme.title.split(" · ").map((part, i) => (
                    <span key={part} className="block">
                      {i === 0 ? part : `· ${part}`}
                    </span>
                  ))}
                </h2>
              </div>
            </div>

            <p className="mt-6 text-[15px] leading-8 text-ink-2">{r.theme.text}</p>

            <div className="relative mt-6 rounded-[3px] border border-gold/35 bg-[rgba(255,250,238,0.7)] py-4 pl-[4.25rem] pr-4">
              <Seal text="解曰" size={40} rotate={-3} className="absolute left-4 top-4" />
              <p className="text-[15px] leading-8 text-ink-2">{r.qian.jie}</p>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <div className="cell py-3.5">
                <div className="mx-auto mb-1.5 h-7 w-7 rounded-full border border-ink/15 shadow-inner" style={{ background: r.lucky.colorHex }} />
                <div className="font-brush text-[20px] leading-tight">{r.lucky.color}</div>
                <div className="mt-0.5 text-[11px] tracking-[0.2em] text-ink-3">幸运色</div>
              </div>
              <div className="cell py-3.5">
                <div className="font-brush text-[28px] leading-[36px] text-cinnabar">{r.lucky.numbers.join("·")}</div>
                <div className="mt-0.5 text-[11px] tracking-[0.2em] text-ink-3">幸运数字</div>
              </div>
              <div className="cell py-3.5">
                <div className="font-brush text-[26px] leading-[36px]">{r.lucky.wealth}</div>
                <div className="mt-0.5 text-[11px] tracking-[0.2em] text-ink-3">财神方位</div>
              </div>
            </div>
            <p className="mt-2.5 text-[12px] tracking-wider text-ink-3">
              命局喜{r.lucky.element}，喜神在{r.lucky.joy}。
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="flex gap-3 rounded-[3px] border border-cinnabar/20 bg-[rgba(241,220,207,0.45)] px-3.5 py-3">
                <span className="font-brush text-[24px] leading-none text-cinnabar">宜</span>
                <p className="text-[14px] leading-7 text-ink-2">{r.yi.join(" · ")}</p>
              </div>
              <div className="flex gap-3 rounded-[3px] border border-ink/12 bg-[rgba(27,23,20,0.04)] px-3.5 py-3">
                <span className="font-brush text-[24px] leading-none text-ink-2">忌</span>
                <p className="text-[14px] leading-7 text-ink-2">{r.ji.join(" · ")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {interpretation ??
        (r.interpretation ? (
          <section className="panel p-6 md:p-8">
            <h3 className="panel-title">先生细说</h3>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-8 text-ink-2">{r.interpretation}</p>
          </section>
        ) : null)}

      <section className="panel p-5 md:p-8">
        <div className="mb-3 flex items-baseline gap-3">
          <h3 className="panel-title flex-1">十二时辰运势 K 线</h3>
          <span className="hidden shrink-0 text-[12px] tracking-widest text-ink-3 sm:inline">红涨绿跌</span>
        </div>
        <KLineChart candles={r.hours} highlight={[r.bestHour.label]} caption={`最旺 ${r.bestHour.label}（${r.bestHour.range}），宜避 ${r.worstHour.label}（${r.worstHour.range}）`} />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="panel p-6 md:p-8">
          <h3 className="panel-title mb-5">四时运势</h3>
          <DimBars dims={r.dims} />
        </div>
        <div className="panel p-6 md:p-8">
          <h3 className="panel-title mb-4">今日提点</h3>
          <ul className="space-y-3 text-[15px] leading-7 text-ink-2">
            {r.notes.map((n) => (
              <li key={n} className="flex gap-3">
                <i className="mt-[11px] h-1.5 w-1.5 shrink-0 rotate-45 bg-cinnabar" />
                {n}
              </li>
            ))}
            {r.remedy ? (
              <li className="flex gap-3 text-jade">
                <i className="mt-[11px] h-1.5 w-1.5 shrink-0 rotate-45 bg-jade" />
                化解：{r.remedy}
              </li>
            ) : null}
            {!r.notes.length && !r.remedy ? <li className="text-ink-3">今日命局平顺，按部就班即可。</li> : null}
          </ul>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="panel p-6 md:p-8">
          <BaziCard bazi={r.bazi} />
        </div>
        <div className="panel p-6 md:p-8">
          <div className="mb-4 flex items-baseline gap-3">
            <h3 className="panel-title flex-1">今日黄历</h3>
            <span className="shrink-0 text-[12px] tracking-wider text-ink-3">
              {r.almanac.yearGanZhi}年 {r.almanac.monthGanZhi}月 {r.almanac.dayGanZhi}日
            </span>
          </div>
          <dl className="grid grid-cols-[3.2em_1fr] gap-y-2.5 text-[14px] leading-7 text-ink-2">
            <dt className="font-brush text-[18px] text-cinnabar">宜</dt>
            <dd>{r.almanac.yi.join(" ") || "诸事不宜"}</dd>
            <dt className="font-brush text-[18px] text-ink-3">忌</dt>
            <dd>{r.almanac.ji.join(" ") || "—"}</dd>
            <dt className="font-brush text-[18px] text-ink-3">冲煞</dt>
            <dd>
              {r.almanac.chong} {r.almanac.sha}
            </dd>
            <dt className="font-brush text-[18px] text-ink-3">值神</dt>
            <dd>
              {r.almanac.tianShen}（{r.almanac.tianShenLuck === "吉" ? "黄道" : "黑道"}）· 建除{r.almanac.zhiXing}
            </dd>
          </dl>
        </div>
      </section>
    </div>
  );
}
