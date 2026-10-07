"use client";

import { useRef, useState } from "react";
import { BirthForm, draftToPayload, useStoredDraft } from "@/components/fortune/BirthForm";
import { Interpretation } from "@/components/fortune/Interpretation";
import { MatchView, RedThread } from "@/components/match/MatchView";
import { ShareBar } from "@/components/share/ShareBar";
import { AccessGate } from "@/components/wallet/AccessGate";
import { useWallet } from "@/components/wallet/WalletProvider";
import { ApiError, api, type MatchReading } from "@/lib/client/api";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function MatchPage() {
  const w = useWallet();
  const self = useStoredDraft("bfate:birth:self");
  const partner = useStoredDraft("bfate:birth:partner");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MatchReading | null>(null);
  const [ai, setAi] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  async function run() {
    setError(null);
    setNote(null);
    const a = draftToPayload(self.draft);
    const b = draftToPayload(partner.draft);
    if (!a || !b) {
      setError("请把两个人的公历生日与性别都填好");
      return;
    }
    if (!w.address) {
      w.openPicker();
      return;
    }
    setBusy(true);
    setResult(null);
    const minDraw = sleep(2000);
    try {
      const res = await api.match({ ...a, name: self.draft.name.trim() || "你" }, { ...b, name: partner.draft.name.trim() || "TA" });
      await minDraw;
      w.setQuota(res.quota);
      setAi(res.ai);
      setResult(res.reading);
      if (res.via === "cache") setNote("这对组合本月已合过盘，结果不变（不计次数）。");
      else if (res.via === "free") setNote(`已使用 1 次免费机会，今日还剩 ${res.quota.freeLeft} 次。`);
      else setNote("已使用 1 次付费额度。");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    } catch (e) {
      await minDraw;
      if (e instanceof ApiError && e.status === 401) {
        await w.refresh();
        w.openPicker();
        setError("登录已过期，请重新连接钱包");
      } else if (e instanceof ApiError && e.status === 402) {
        await w.refresh();
        setError(e.message + "，可在下方付费后再合盘。");
      } else {
        setError(e instanceof Error ? e.message : "出了点问题，请重试");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-8">
      <header className="text-center">
        <p className="text-[12px] tracking-[0.5em] text-ink-3">两 人 生 辰 八 字 合 盘</p>
        <h1 className="ink-text mt-2 font-brush text-[46px] tracking-[0.22em] md:text-[56px]">姻缘合盘</h1>
      </header>

      <section className="panel mt-7 px-5 pb-8 pt-7 md:px-9">
        <div className="mb-7">
          {busy ? (
            <RedThread a={self.draft.name.trim() || "你"} b={partner.draft.name.trim() || "TA"} />
          ) : (
            <p className="ink-text text-center font-brush text-[26px] tracking-[0.3em] text-ink-2">千里姻缘一线牵</p>
          )}
        </div>
        <div className="grid gap-8 md:grid-cols-2 md:gap-10">
          <BirthForm value={self.draft} onChange={self.save} title="你" withName namePlaceholder="你的称呼（选填）" />
          <BirthForm value={partner.draft} onChange={partner.save} title="TA" withName namePlaceholder="TA 的称呼（选填）" />
        </div>
        <div className="mx-auto mt-8 max-w-sm">
          <button type="button" className="btn-seal w-full" disabled={busy} onClick={() => void run()}>
            {busy ? "月老牵线中…" : "牵红线 · 测姻缘"}
          </button>
          {note ? <p className="mt-3 text-center text-[13px] text-jade">{note}</p> : null}
          {error ? <p className="mt-3 text-center text-[13px] text-cinnabar">{error}</p> : null}
        </div>
        <p className="mt-5 text-center text-[12px] tracking-wider text-ink-3">两人的生辰只保存在本机，仅在合盘时发送一次。</p>
      </section>

      <div className="mt-5">
        <AccessGate />
      </div>

      <div ref={resultRef} className="scroll-mt-20">
        {result ? (
          <div className="mt-10">
            <MatchView r={result} interpretation={<Interpretation key={result.id} id={result.id} initial={result.interpretation} enabled={ai} />} />
            <ShareBar id={result.id} title={`我们的缘分指数 ${result.score}：${result.title}`} label="分享这段缘分" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
