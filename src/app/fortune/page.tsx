"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { BirthForm, describeDraft, draftToPayload, useStoredDraft } from "@/components/fortune/BirthForm";
import { FortuneView } from "@/components/fortune/FortuneView";
import { Interpretation } from "@/components/fortune/Interpretation";
import { Qiantong, type TubeState } from "@/components/fortune/Qiantong";
import { ShareBar } from "@/components/share/ShareBar";
import { AccessGate } from "@/components/wallet/AccessGate";
import { useWallet } from "@/components/wallet/WalletProvider";
import { ApiError, api, type FortuneReading } from "@/lib/client/api";
import { cnNumber } from "@/lib/client/format";
import { useStoredString, writeStored } from "@/lib/client/storage";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const LAST = "bfate:last-fortune";

/** 北京时间的今天，用来判断本机存的签是不是今天的。 */
const todayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

/** 坐标保留两位小数：服务端与浏览器的三角函数末位可能不同，不取整会导致水合不一致。 */
const r2 = (n: number) => Math.round(n * 100) / 100;

/** 签筒背后的一圈罗盘刻度：二十四山向的短刻 + 十二地支。 */
function CompassBackdrop() {
  const zhi = "子丑寅卯辰巳午未申酉戌亥";
  return (
    <svg viewBox="0 0 400 400" className="pointer-events-none absolute left-1/2 top-1/2 h-[118%] w-auto -translate-x-1/2 -translate-y-1/2 opacity-[0.55]" aria-hidden="true">
      <defs>
        <radialGradient id="altar-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff7e2" stopOpacity="0.95" />
          <stop offset="0.6" stopColor="#f6e7c4" stopOpacity="0.35" />
          <stop offset="1" stopColor="#f6e7c4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="198" fill="url(#altar-glow)" />
      <g fill="none" stroke="#a98544">
        <circle cx="200" cy="200" r="178" strokeOpacity="0.45" />
        <circle cx="200" cy="200" r="170" strokeOpacity="0.25" />
        <circle cx="200" cy="200" r="132" strokeOpacity="0.3" strokeDasharray="2 5" />
      </g>
      {Array.from({ length: 72 }, (_, i) => {
        const a = (i / 72) * Math.PI * 2;
        const long = i % 6 === 0;
        const r1 = long ? 160 : 165;
        return (
          <line
            key={i}
            x1={r2(200 + Math.sin(a) * r1)}
            y1={r2(200 - Math.cos(a) * r1)}
            x2={r2(200 + Math.sin(a) * 170)}
            y2={r2(200 - Math.cos(a) * 170)}
            stroke="#a98544"
            strokeOpacity={long ? 0.6 : 0.3}
          />
        );
      })}
      {[...zhi].map((z, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <text
            key={z}
            x={r2(200 + Math.sin(a) * 147)}
            y={r2(200 - Math.cos(a) * 147)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="15"
            fill="#8d6e35"
            fillOpacity="0.75"
            style={{ fontFamily: "var(--font-brush)" }}
          >
            {z}
          </text>
        );
      })}
    </svg>
  );
}

export default function FortunePage() {
  const w = useWallet();
  const { draft, save, loaded } = useStoredDraft("bfate:birth:self");
  const [editing, setEditing] = useState(false);
  const [tube, setTube] = useState<TubeState>("idle");
  const [label, setLabel] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<FortuneReading | null>(null);
  const [ai, setAi] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const landedResolve = useRef<(() => void) | null>(null);

  const ready = Boolean(draftToPayload(draft));
  const showForm = loaded && (!ready || editing);

  // 今天已经求过签：直接把本机存的结果摆出来（每日一签）。
  const lastRaw = useStoredString(LAST);
  const restored = useMemo(() => {
    if (!lastRaw) return null;
    try {
      const saved = JSON.parse(lastRaw) as { day: string; who: string; reading: FortuneReading; ai?: boolean };
      return saved.day === todayKey() && saved.who === describeDraft(draft) ? saved : null;
    } catch {
      return null;
    }
  }, [lastRaw, draft]);
  const shown = result ?? restored?.reading ?? null;
  const shownAi = result ? ai : Boolean(restored?.ai);
  const tubeShown: TubeState = tube === "idle" && !result && restored ? "drawn" : tube;
  const labelShown = label ?? (restored ? `第${cnNumber(restored.reading.qian.no)}签` : undefined);
  const noteShown = note ?? (!result && restored && tube === "idle" ? "今日已求过签，每日一签，结果不变。" : null);

  async function draw() {
    if (tube === "shaking") return;
    setError(null);
    setNote(null);
    const payload = draftToPayload(draft);
    if (!payload) {
      setEditing(true);
      setError("请先填写公历生日与性别");
      return;
    }
    if (!w.address) {
      w.openPicker();
      return;
    }
    setResult(null);
    setTube("shaking");
    const minShake = sleep(1900);
    try {
      const res = await api.fortune(payload);
      await minShake;
      w.setQuota(res.quota);
      // 签落地后再把结果铺开；动画异常时最多等 2.6 秒
      const landed = new Promise<void>((resolve) => {
        landedResolve.current = resolve;
        setTimeout(resolve, 2600);
      });
      setLabel(`第${cnNumber(res.reading.qian.no)}签`);
      setTube("drawn");
      await landed;
      landedResolve.current = null;
      setAi(res.ai);
      setResult(res.reading);
      if (res.via === "cache") setNote("今日已求过签，每日一签，结果不变（不计次数）。");
      else if (res.via === "free") setNote(`已使用 1 次免费机会，今日还剩 ${res.quota.freeLeft} 次。`);
      else setNote("已使用 1 次付费额度。");
      writeStored(LAST, JSON.stringify({ day: todayKey(), who: describeDraft(draft), reading: res.reading, ai: res.ai }));
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 350);
    } catch (e) {
      await minShake;
      setTube("idle");
      if (e instanceof ApiError && e.status === 401) {
        await w.refresh();
        w.openPicker();
        setError("登录已过期，请重新连接钱包");
      } else if (e instanceof ApiError && e.status === 402) {
        await w.refresh();
        setError(e.message + "，可在右侧付费后再摇。");
      } else {
        setError(e instanceof Error ? e.message : "出了点问题，请重试");
      }
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-8">
      <header className="text-center">
        <p className="text-[12px] tracking-[0.5em] text-ink-3">以 八 字 对 照 今 日 干 支 与 黄 历</p>
        <h1 className="ink-text mt-2 font-brush text-[46px] tracking-[0.22em] md:text-[56px]">今日运势</h1>
      </header>

      <div className="mt-7 grid gap-5 md:grid-cols-[1fr_330px]">
        <section className="panel flex flex-col items-center overflow-hidden px-4 pb-7 pt-5">
          <div className="relative w-full">
            <CompassBackdrop />
            <Qiantong state={tubeShown} label={labelShown} onActivate={() => void draw()} onLanded={() => landedResolve.current?.()} disabled={tube === "shaking"} />
          </div>
          <button type="button" className="btn-seal relative mt-2 w-full max-w-xs" disabled={tube === "shaking"} onClick={() => void draw()}>
            {tube === "shaking" ? "诚心默念，签将出…" : shown ? "再看今日签" : "摇签问今日"}
          </button>
          <p className="mt-3 text-[12px] tracking-[0.2em] text-ink-4">{tube === "shaking" ? "心中默念所问之事" : "点签筒或按钮摇签"}</p>
          {noteShown ? <p className="mt-2 text-center text-[13px] text-jade">{noteShown}</p> : null}
          {error ? <p className="mt-2 text-center text-[13px] text-cinnabar">{error}</p> : null}
        </section>

        <aside className="order-first space-y-4 md:order-none">
          <div className="panel p-5 md:p-6">
            {showForm ? (
              <>
                <BirthForm value={draft} onChange={save} title="你的生辰" />
                {ready ? (
                  <button type="button" className="btn-ink mt-5 w-full !min-h-11 !text-lg" onClick={() => setEditing(false)}>
                    确定
                  </button>
                ) : null}
                <p className="mt-4 text-[12px] leading-5 text-ink-3">生辰只保存在本机，用于推算你的四柱八字。</p>
              </>
            ) : (
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="panel-title flex-1">你的生辰</h3>
                  <button type="button" className="shrink-0 text-[13px] tracking-widest text-cinnabar" onClick={() => setEditing(true)}>
                    修改
                  </button>
                </div>
                <p className="mt-3 text-[15px] text-ink-2">{describeDraft(draft)}</p>
              </div>
            )}
          </div>
          <AccessGate />
        </aside>
      </div>

      <div ref={resultRef} className="scroll-mt-20">
        {shown ? (
          <div className="mt-10">
            <FortuneView r={shown} interpretation={<Interpretation key={shown.id} id={shown.id} initial={shown.interpretation} enabled={shownAi} />} />
            <ShareBar id={shown.id} title={`我今天求到${shown.qian.level}，你也来问问`} />
            <div className="mt-6 text-center">
              <Link href="/match" className="btn-ink">
                再测一测姻缘 →
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
