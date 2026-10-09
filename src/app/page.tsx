import Link from "next/link";
import { HeroScene } from "@/components/hero/HeroScene";
import { IconKline, IconKnot, IconQian } from "@/components/ink/Icons";
import { Seal } from "@/components/ink/Seal";
import { XLink } from "@/components/site/XLink";
import { almanacFor, todayYmd } from "@/lib/fate/bazi";
import { cnNumber } from "@/lib/client/format";
import { publicConfig } from "@/lib/config";

export const revalidate = 600;

const FEATURES = [
  {
    icon: IconQian,
    title: "一支今日签",
    text: "以你的八字对照今日干支与老黄历，摇出今天的一支签，附原创签诗与解曰。",
    href: "/fortune",
  },
  {
    icon: IconKline,
    title: "十二时辰 K 线",
    text: "把一天的运势画成 K 线：哪个时辰最旺、哪个时辰宜避，一眼看清。",
    href: "/fortune",
  },
  {
    icon: IconKnot,
    title: "姻缘合盘",
    text: "两人生辰合盘：生肖、日主、夫妻宫与五行互补，附未来十二个月的姻缘 K 线。",
    href: "/match",
  },
];

/** 公历年份写成汉字：2026 → 二〇二六 */
const cnYear = (y: number) => [...String(y)].map((d) => "〇一二三四五六七八九"[Number(d)]).join("");

export default function Home() {
  const t = todayYmd(publicConfig.timeZone);
  const a = almanacFor(t.y, t.m, t.d);
  const burn = publicConfig.payTo.toLowerCase() === "0x000000000000000000000000000000000000dead";

  return (
    <div className="pb-20">
      {/* ── 首屏 ── */}
      <HeroScene>
        <div className="mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-5xl flex-col items-center px-5 text-center">
          <div className="flex flex-col items-center pt-[15svh] md:pt-[14svh]">
            <p className="hero-in text-[12px] tracking-[0.55em] text-ink-3 md:text-[13px]">传统黄历 · 四柱八字 · 运势 K 线</p>
            <div className="relative mt-5 md:mt-6">
              <h1 className="hero-title ink-text whitespace-nowrap font-brush text-[clamp(52px,19vw,74px)] leading-none tracking-[0.1em] text-ink md:text-[124px]">
                {[..."知命顺势"].map((c, i) => (
                  <span key={i} style={{ animationDelay: `${0.25 + i * 0.24}s` }}>
                    {c}
                  </span>
                ))}
              </h1>
              <Seal text="知命" size={38} className="absolute -bottom-3 -right-4 md:-right-9 md:bottom-0" animate style={{ animationDelay: "1.45s" }} />
              {/* 题款：今天的干支与农历，竖排在标题左侧 */}
              <div
                className="hero-in vertical absolute -left-14 top-0 hidden whitespace-nowrap font-brush text-[17px] tracking-[0.3em] text-ink-3 md:block"
                style={{ animationDelay: "1.6s" }}
              >
                {a.yearGanZhi}年{a.lunar}
              </div>
            </div>
            <p
              className="hero-in mt-6 whitespace-nowrap font-brush text-[clamp(18px,6.2vw,25px)] tracking-[0.3em] text-ink-2 md:mt-8 md:text-[30px]"
              style={{ animationDelay: "1.25s" }}
            >
              今日运势 · 姻缘合盘
            </p>

            <div
              className="hero-in mt-7 inline-flex flex-col items-stretch overflow-hidden rounded-[3px] border border-gold/55 bg-[rgba(255,251,240,0.78)] text-[13px] text-ink-2 shadow-[0_10px_24px_-18px_rgba(90,60,20,0.6)] backdrop-blur-[3px] md:flex-row md:text-[14px]"
              style={{ animationDelay: "1.45s" }}
            >
              <span className="flex items-center justify-center gap-2 bg-[linear-gradient(180deg,rgba(239,227,198,0.9),rgba(232,214,172,0.9))] px-5 py-2 text-[#6d4f17]">
                <i className="h-1.5 w-1.5 rotate-45 bg-cinnabar" />
                Binance Web3 钱包 · 每日免费 {publicConfig.freeDailyBinance} 次
              </span>
              <span className="px-5 py-2">
                其他钱包 · 每次 {publicConfig.price} ${publicConfig.tokenSymbol}
              </span>
            </div>

            <div className="hero-in mt-8 flex w-full max-w-[22rem] gap-3" style={{ animationDelay: "1.65s" }}>
              <Link href="/fortune" className="btn-seal flex-1">
                求今日签
              </Link>
              <Link href="/match" className="btn-ink flex-1">
                测姻缘
              </Link>
            </div>
            <div className="hero-in mt-5 text-[13px] tracking-wider" style={{ animationDelay: "1.85s" }}>
              <XLink />
            </div>
          </div>
          <div className="hero-in mt-auto flex flex-col items-center gap-2 pb-24 pt-10 text-[12px] tracking-[0.3em] text-ink-3 md:pb-10" style={{ animationDelay: "2.2s" }}>
            <span>今日黄历</span>
            <span className="scroll-cue" />
          </div>
        </div>
      </HeroScene>

      {/* ── 今日黄历：不用连钱包也能看 ── */}
      <section className="relative z-10 mx-auto -mt-4 max-w-5xl px-4">
        <div className="panel px-5 pb-6 pt-7 md:px-9 md:pb-9 md:pt-10">
          <div className="grid gap-7 md:grid-cols-[200px_1fr] md:gap-10">
            {/* 日期 */}
            <div className="flex items-center gap-5 md:flex-col md:items-start md:gap-3">
              <div>
                <div className="text-[12px] tracking-[0.25em] text-ink-3">
                  {cnYear(t.y)}年{cnNumber(t.m)}月
                </div>
                <div className="ink-text font-brush text-[92px] leading-[0.95] text-cinnabar md:text-[118px]">{t.d}</div>
                <div className="text-[13px] tracking-[0.2em] text-ink-2">{a.weekday}</div>
              </div>
              <div className="flex items-start gap-3 md:mt-2">
                <div className="vertical font-brush text-[26px] leading-none tracking-[0.12em] text-ink">农历{a.lunar}</div>
                <div className="vertical text-[12px] leading-none tracking-[0.3em] text-ink-3">
                  {a.yearGanZhi}年 {a.monthGanZhi}月 {a.dayGanZhi}日
                </div>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <h2 className="panel-title flex-1 !text-[26px]">今日黄历</h2>
                <span
                  className={`rounded-[2px] px-2.5 py-1 text-[12px] tracking-widest ${a.tianShenLuck === "吉" ? "bg-cinnabar text-paper" : "bg-ink-2 text-paper"}`}
                >
                  {a.tianShen} · {a.tianShenLuck === "吉" ? "黄道吉日" : "黑道日"}
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="flex gap-4">
                  <Seal text="宜" size={44} rotate={-3} />
                  <p className="flex-1 text-[15px] leading-8 text-ink-2">{a.yi.slice(0, 12).join("　") || "诸事不宜"}</p>
                </div>
                <div className="flex gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[4px] bg-ink-2 font-brush text-[26px] text-paper">忌</span>
                  <p className="flex-1 text-[15px] leading-8 text-ink-2">{a.ji.slice(0, 12).join("　") || "—"}</p>
                </div>
              </div>

              <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-gold/30 bg-gold/25 md:grid-cols-5">
                {[
                  ["冲煞", `${a.chong} ${a.sha}`],
                  ["财神", a.cai],
                  ["喜神", a.xi],
                  ["福神", a.fu],
                  ["值星", `${a.zhiXing}日 · ${a.xiu}宿`],
                ].map(([k, v]) => (
                  <div key={k} className="bg-[rgba(255,252,243,0.92)] px-3 py-2.5 last:col-span-2 md:last:col-span-1">
                    <dt className="text-[11px] tracking-[0.3em] text-ink-3">{k}</dt>
                    <dd className="mt-0.5 font-brush text-[19px] text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* 十二时辰吉凶 */}
          <div className="mt-8">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="panel-title flex-1 !text-[20px]">十二时辰吉凶</h3>
            </div>
            <ol className="grid grid-cols-6 gap-px overflow-hidden rounded-[3px] border border-gold/30 bg-gold/25 md:grid-cols-12">
              {a.hours.map((h) => (
                <li key={h.zhi} className={`relative px-1 py-2.5 text-center ${h.luck === "吉" ? "bg-[rgba(255,250,238,0.95)]" : "bg-[rgba(244,238,226,0.95)]"}`}>
                  <div className={`font-brush text-[22px] leading-none ${h.luck === "吉" ? "text-cinnabar" : "text-ink-3"}`}>{h.zhi}</div>
                  <div className="mt-1 text-[10px] tabular-nums text-ink-3">{h.range.slice(0, 5)}</div>
                  <div className={`mt-1 text-[11px] ${h.luck === "吉" ? "text-cinnabar" : "text-ink-4"}`}>{h.luck}</div>
                </li>
              ))}
            </ol>
          </div>

          <p className="mt-7 border-t border-gold/25 pt-5 text-[14px] leading-7 text-ink-3">
            这是所有人共用的黄历。想知道今天对<b className="font-semibold text-ink-2">你</b>意味着什么？
            <Link href="/fortune" className="ml-1 text-cinnabar underline decoration-cinnabar/40 underline-offset-[5px]">
              用你的生辰求一支签 →
            </Link>
          </p>
        </div>
      </section>

      {/* ── 三件事 ── */}
      <section className="mx-auto mt-20 max-w-5xl px-4">
        <div className="text-center">
          <p className="text-[12px] tracking-[0.5em] text-ink-3">一 签 · 一 线 · 一 姻 缘</p>
          <h2 className="ink-text mt-2 font-brush text-[40px] tracking-[0.2em] md:text-[48px]">问今日，问良缘</h2>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {FEATURES.map((f) => (
            <Link key={f.title} href={f.href} className="panel group block px-6 pb-7 pt-8 transition-transform duration-300 hover:-translate-y-1">
              <f.icon size={58} />
              <h3 className="mt-4 font-brush text-[26px] tracking-wider">{f.title}</h3>
              <p className="mt-2 text-[14px] leading-7 text-ink-2">{f.text}</p>
              <span className="mt-4 inline-block text-[13px] tracking-widest text-cinnabar opacity-80 transition-opacity group-hover:opacity-100">去看看 →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 怎么用、怎么收费 ── */}
      <section className="mx-auto mt-16 max-w-5xl px-4">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="panel p-6 md:p-8">
            <h2 className="panel-title !text-[26px]">三步问运</h2>
            <ol className="mt-6 space-y-5">
              {[
                ["连接钱包", "签名一次确认钱包归属，不发起交易、不花 gas。"],
                ["填写生辰", "公历生日、时辰与性别，只保存在你自己的设备上。"],
                ["摇签 / 合盘", "摇出今日之签，或两人牵一根红线，结果可分享。"],
              ].map(([k, v], i) => (
                <li key={k} className="flex gap-4">
                  <Seal text={["一", "二", "三"][i]} size={38} rotate={i % 2 ? 4 : -4} variant="zhu" />
                  <div>
                    <div className="font-brush text-[22px] leading-tight">{k}</div>
                    <p className="mt-1 text-[14px] leading-6 text-ink-3">{v}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="panel p-6 md:p-8">
            <h2 className="panel-title !text-[26px]">一句话说清</h2>
            <div className="mt-6 space-y-3">
              <div className="relative overflow-hidden rounded-[3px] border border-gold/50 bg-[linear-gradient(135deg,rgba(242,229,196,0.95),rgba(232,212,166,0.9))] p-5">
                <div className="absolute inset-0 bg-[url(/art/gold.webp)] bg-[length:420px] opacity-70" />
                <div className="relative">
                  <div className="font-brush text-[24px] text-[#6d4f17]">Binance Web3 钱包</div>
                  <p className="mt-1 text-[15px] text-ink-2">
                    每日免费 <b className="font-brush text-[24px] font-normal text-cinnabar">{publicConfig.freeDailyBinance}</b> 次，北京时间零点重置
                  </p>
                </div>
              </div>
              <div className="cell p-5">
                <div className="font-brush text-[24px]">其他钱包</div>
                <p className="mt-1 text-[15px] text-ink-2">
                  每次 <b className="font-brush text-[24px] font-normal text-cinnabar">{publicConfig.price}</b> ${publicConfig.tokenSymbol}
                  {burn ? "，支付的代币直接打入黑洞销毁" : ""}
                </p>
              </div>
              <p className="pt-1 text-[13px] leading-6 text-ink-3">同一天同一份生辰，重复查看今日签不再计次。</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
