import { Seal } from "@/components/ink/Seal";
import type { FortuneReading } from "@/lib/client/api";
import { cnDate, cnNumber } from "@/lib/client/format";

const LEVEL_COLOR: Record<string, string> = {
  great: "#a8261d",
  good: "#7d5f27",
  fair: "#2f4a55",
  low: "#4a433b",
};

/* 签文立轴：天杆挂绳、月白绫裱、朱丝栏画心，地杆带两枚轴头。
   出现时自上而下展开，展开后盖上两枚印。 */
export function QianScroll({ qian, date, animate = true }: { qian: FortuneReading["qian"]; date?: string; animate?: boolean }) {
  const color = LEVEL_COLOR[qian.tone] ?? LEVEL_COLOR.fair;
  return (
    <figure className={`qian-scroll ${animate ? "is-unrolling" : ""}`} aria-label={`第${qian.no}签 ${qian.level}：${qian.poem.join("，")}`}>
      {/* 挂绳与天杆 */}
      <svg className="qian-cord" viewBox="0 0 200 40" aria-hidden="true">
        <path d="M30 38 L 100 6 L 170 38" fill="none" stroke="#6b3a24" strokeWidth="1.6" />
        <circle cx="100" cy="6" r="3.2" fill="#a98544" />
      </svg>
      <div className="qian-rod" aria-hidden="true" />
      <div className="qian-mount">
        <div className="qian-heart">
          <div className="qian-head">
            <div className="font-brush text-[17px] tracking-[0.35em] text-ink-3">第{cnNumber(qian.no)}签</div>
            <div className="ink-text mt-1 font-brush text-[50px] leading-none tracking-[0.12em]" style={{ color }}>
              {qian.level}
            </div>
          </div>
          <div className="qian-poem font-brush">
            {qian.poem.map((line, i) => (
              <span key={i} className="vertical ink-text">
                {line}
              </span>
            ))}
          </div>
          <div className="qian-foot">
            <Seal text="灵签" size={36} rotate={-4} className="qian-seal" />
            <div className="text-right leading-tight">
              {date ? <div className="font-brush text-[13px] tracking-[0.12em] text-ink-3">{cnDate(date)}</div> : null}
              <div className="mt-1 text-[12px] tracking-[0.2em] text-ink-2">
                BFATE <span className="font-brush text-[15px]">敬录</span>
              </div>
            </div>
          </div>
          <Seal text="吉祥" size={28} rotate={3} variant="zhu" className="qian-seal-top" />
        </div>
      </div>
      <div className="qian-roller" aria-hidden="true" />
    </figure>
  );
}
