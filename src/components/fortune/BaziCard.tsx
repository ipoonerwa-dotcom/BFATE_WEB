import type { Bazi } from "@/lib/fate/bazi";
import { GAN_WX, WX_COLOR, ZHI_WX } from "@/lib/client/format";

/* 四柱八字：年月日时四列，天干在上地支在下，按五行着色；下方是五行分布。 */
export function BaziCard({ bazi, title = "你的八字" }: { bazi: Bazi; title?: string }) {
  const cols = [
    { label: "年柱", p: bazi.year },
    { label: "月柱", p: bazi.month },
    { label: "日柱", p: bazi.day, master: true },
    { label: "时柱", p: bazi.time },
  ];
  const total = Object.values(bazi.wuxing).reduce((a, b) => a + b, 0) || 1;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="panel-title flex-1">{title}</h3>
        <span className="text-[12px] tracking-wider text-ink-3">
          {bazi.lunarText} · 属{bazi.shengxiao} · {bazi.yearNaYin}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2.5 text-center">
        {cols.map((c) => (
          <div
            key={c.label}
            className={`relative rounded-[3px] border py-3 ${c.master ? "border-cinnabar/35 bg-[rgba(241,220,207,0.5)]" : "border-ink/10 bg-[rgba(255,252,243,0.6)]"}`}
          >
            <div className="text-[11px] tracking-[0.2em] text-ink-3">{c.master ? "日主" : c.label}</div>
            {c.p ? (
              <>
                <div className="ink-text mt-1 font-brush text-[34px] leading-tight" style={{ color: WX_COLOR[GAN_WX[c.p.gan]] }}>
                  {c.p.gan}
                </div>
                <div className="ink-text font-brush text-[34px] leading-tight" style={{ color: WX_COLOR[ZHI_WX[c.p.zhi]] }}>
                  {c.p.zhi}
                </div>
                <div className="mt-1 text-[11px] tracking-[0.2em] text-ink-3">
                  {GAN_WX[c.p.gan]}
                  {ZHI_WX[c.p.zhi]}
                </div>
              </>
            ) : (
              <div className="grid h-[96px] place-items-center text-[12px] text-ink-4">未知</div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-5 flex h-2 gap-[3px] overflow-hidden rounded-full">
        {(Object.entries(bazi.wuxing) as [string, number][]).map(([wx, n]) =>
          n > 0 ? <div key={wx} className="first:rounded-l-full last:rounded-r-full" style={{ width: `${(n / total) * 100}%`, background: WX_COLOR[wx] }} title={`${wx} ${n}`} /> : null,
        )}
      </div>
      <div className="mt-2.5 flex justify-between text-[12px] text-ink-3">
        {(Object.entries(bazi.wuxing) as [string, number][]).map(([wx, n]) => (
          <span key={wx} className="flex items-center gap-1">
            <i className="inline-block h-2 w-2 rotate-45" style={{ background: WX_COLOR[wx] }} />
            <b className="font-brush text-[15px] font-normal text-ink-2">{wx}</b> {n}
          </span>
        ))}
      </div>
    </div>
  );
}
