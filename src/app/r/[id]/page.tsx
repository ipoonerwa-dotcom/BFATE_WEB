import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FortuneView } from "@/components/fortune/FortuneView";
import { MatchView } from "@/components/match/MatchView";
import type { FortuneReading, MatchReading } from "@/lib/client/api";
import { getReading } from "@/lib/server/readings";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const r = await getReading((await params).id);
  if (!r) return { title: "解读不存在" };
  return r.kind === "fortune"
    ? { title: `${r.qian.level} · 第${r.qian.no}签 · 今日运势`, description: r.qian.poem.join("，") }
    : { title: `缘分指数 ${r.score} · ${r.title}`, description: r.summary };
}

export default async function SharedReading({ params }: { params: Promise<{ id: string }> }) {
  const r = await getReading((await params).id);
  if (!r) notFound();
  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-8">
      <p className="mb-6 text-center text-[12px] tracking-[0.4em] text-ink-3">朋友分享的{r.kind === "fortune" ? `今日签 · ${r.date}` : "姻缘合盘"}</p>
      {r.kind === "fortune" ? <FortuneView r={r as FortuneReading} /> : <MatchView r={r as MatchReading} />}
      <div className="mx-auto mt-10 max-w-sm">
        <Link href={r.kind === "fortune" ? "/fortune" : "/match"} className="btn-seal w-full">
          {r.kind === "fortune" ? "我也求一支今日签" : "我也测一测姻缘"}
        </Link>
      </div>
    </div>
  );
}
