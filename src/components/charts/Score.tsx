/* 分数与维度图。坐标统一保留两位小数，避免服务端与浏览器三角函数末位不同导致水合不一致。 */
const r2 = (n: number) => Math.round(n * 100) / 100;

/** 罗盘式分数盘：外圈六十刻、朱砂弧表示分数、中间毛笔数字。 */
export function ScoreDial({ score, label, size = 170, className = "" }: { score: number; label: string; size?: number; className?: string }) {
  const R = 78;
  const c = 2 * Math.PI * R;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * c;
  return (
    // 字号用容器宽度单位，外面用 className 改尺寸时数字跟着缩放
    <div className={`relative inline-grid aspect-square shrink-0 place-items-center [container-type:inline-size] ${className}`} style={className ? undefined : { width: size }}>
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="dial-bg" cx="0.5" cy="0.45" r="0.55">
            <stop offset="0" stopColor="#fffaf0" />
            <stop offset="1" stopColor="#f1e6cd" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="97" fill="url(#dial-bg)" stroke="#a98544" strokeOpacity="0.55" />
        <circle cx="100" cy="100" r="92" fill="none" stroke="#a98544" strokeOpacity="0.25" />
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i / 60) * Math.PI * 2;
          const long = i % 5 === 0;
          const r1 = long ? 84.5 : 87.5;
          return (
            <line
              key={i}
              x1={r2(100 + Math.sin(a) * r1)}
              y1={r2(100 - Math.cos(a) * r1)}
              x2={r2(100 + Math.sin(a) * 91)}
              y2={r2(100 - Math.cos(a) * 91)}
              stroke="#8d6e35"
              strokeOpacity={long ? 0.7 : 0.35}
              strokeWidth={long ? 1.2 : 0.8}
            />
          );
        })}
        <circle cx="100" cy="100" r={R} fill="none" stroke="#1b1714" strokeOpacity="0.07" strokeWidth="7" />
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke="url(#dial-arc)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${r2(filled)} ${r2(c)}`}
          transform="rotate(-90 100 100)"
          style={{ animation: "dial-in 1.4s cubic-bezier(.2,.7,.2,1) both" }}
        />
        <defs>
          <linearGradient id="dial-arc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d24a35" />
            <stop offset="1" stopColor="#951f17" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="64" fill="none" stroke="#a98544" strokeOpacity="0.35" strokeDasharray="1.5 3.5" />
      </svg>
      <div className="relative -mt-1 text-center">
        <div className="ink-text font-brush leading-none text-ink" style={{ fontSize: "34cqw" }}>
          {score}
        </div>
        <div className="mt-1 tracking-[0.3em] text-ink-3" style={{ fontSize: "max(10px, 7.4cqw)" }}>
          {label}
        </div>
      </div>
    </div>
  );
}

/** 兼容旧名 */
export const ScoreRing = ScoreDial;

export function DimBars({ dims }: { dims: { name: string; score: number; text?: string }[] }) {
  return (
    <ul className="space-y-5">
      {dims.map((d, i) => {
        const tone = d.score >= 80 ? "#b02d24" : d.score >= 60 ? "#a98544" : "#3d6b5c";
        return (
          <li key={d.name}>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-brush text-[20px] tracking-wider">{d.name}</span>
              <span className="font-brush text-[22px] leading-none" style={{ color: tone }}>
                {d.score}
              </span>
            </div>
            <div className="relative h-[7px] rounded-full bg-[rgba(27,23,20,0.07)]">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${d.score}%`,
                  background: `linear-gradient(90deg, ${tone}55, ${tone})`,
                  transformOrigin: "left",
                  animation: `bar-in .9s cubic-bezier(.2,.7,.2,1) ${0.12 * i}s both`,
                }}
              />
              <i className="absolute top-1/2 h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-paper" style={{ left: `${d.score}%`, background: tone }} />
            </div>
            {d.text ? <p className="mt-2 text-[14px] leading-7 text-ink-2">{d.text}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

export function Radar({ dims, size = 280 }: { dims: { name: string; score: number }[]; size?: number }) {
  const n = dims.length;
  const cx = 140;
  const cy = 132;
  const R = 92;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [r2(cx + Math.cos(a) * R * v), r2(cy + Math.sin(a) * R * v)] as const;
  };
  const poly = dims.map((d, i) => pt(i, d.score / 100).join(",")).join(" ");
  return (
    <svg viewBox="0 0 280 270" width={size} className="mx-auto max-w-full" role="img" aria-label="合盘五维">
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon key={k} points={dims.map((_, i) => pt(i, k).join(",")).join(" ")} fill={k === 1 ? "rgba(255,250,238,0.6)" : "none"} stroke="#a98544" strokeOpacity={k === 1 ? 0.6 : 0.25} />
      ))}
      {dims.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#a98544" strokeOpacity="0.25" />;
      })}
      <polygon points={poly} fill="#b02d24" fillOpacity="0.16" stroke="#b02d24" strokeWidth="1.8" strokeLinejoin="round" style={{ animation: "ink-in 1s ease-out both" }} />
      {dims.map((d, i) => {
        const [x, y] = pt(i, d.score / 100);
        return <circle key={`p${i}`} cx={x} cy={y} r="3" fill="#b02d24" />;
      })}
      {dims.map((d, i) => {
        const [x, y] = pt(i, 1.22);
        return (
          <text key={d.name} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="14" fill="#1b1714" fontFamily="var(--font-brush)">
            {d.name}
            <tspan x={x} dy="16" fontSize="12" fill="#b02d24" fontFamily="var(--font-serif)">
              {d.score}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
