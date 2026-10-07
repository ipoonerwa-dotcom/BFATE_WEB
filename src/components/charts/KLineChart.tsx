"use client";

import { useState } from "react";
import type { Candle } from "@/lib/fate/fortune";

/* 运势 K 线：红涨绿跌（中式行情习惯），蜡烛逐根长出；黄道吉时底下衬一道淡朱；点按某一根看详情。 */
export function KLineChart({ candles, highlight, caption }: { candles: Candle[]; highlight?: string[]; caption?: string }) {
  const [sel, setSel] = useState<number | null>(null);
  const W = 660;
  const H = 280;
  const padL = 32;
  const padR = 8;
  const padT = 26;
  const padB = 38;
  const lo = Math.max(0, Math.floor((Math.min(...candles.map((c) => c.low)) - 6) / 10) * 10);
  const hi = Math.min(100, Math.ceil((Math.max(...candles.map((c) => c.high)) + 6) / 10) * 10);
  const y = (v: number) => padT + ((hi - v) / (hi - lo || 1)) * (H - padT - padB);
  const slot = (W - padL - padR) / candles.length;
  const bodyW = Math.min(24, slot * 0.5);
  const grid = [];
  for (let v = lo; v <= hi; v += 10) grid.push(v);
  const picked = sel !== null ? candles[sel] : null;

  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" role="img" aria-label={caption ?? "运势K线"}>
        <defs>
          <linearGradient id="k-up" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#cf4434" />
            <stop offset="1" stopColor="#9c241c" />
          </linearGradient>
        </defs>
        {candles.map((c, i) =>
          c.luck === "吉" ? (
            <rect key={`bg${i}`} x={padL + slot * i + 1} y={padT - 8} width={slot - 2} height={H - padT - padB + 8} fill="#b02d24" opacity="0.045" rx="2" />
          ) : null,
        )}
        {grid.map((v) => (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#a98544" strokeOpacity={v === 60 ? 0.55 : 0.2} strokeDasharray={v === 60 ? "4 4" : undefined} />
            <text x={padL - 7} y={y(v)} textAnchor="end" dominantBaseline="central" fontSize="11" fill="#7a6f62" fontFamily="var(--font-serif)">
              {v}
            </text>
          </g>
        ))}
        {candles.map((c, i) => {
          const cx = padL + slot * i + slot / 2;
          const up = c.close >= c.open;
          const color = up ? "#a8281f" : "#3d6b5c";
          const top = y(Math.max(c.open, c.close));
          const bottom = y(Math.min(c.open, c.close));
          const isHi = highlight?.includes(c.label);
          return (
            <g
              key={c.label}
              onClick={() => setSel(sel === i ? null : i)}
              style={{
                transformOrigin: `${cx}px ${bottom}px`,
                animation: `grow-up .55s cubic-bezier(.2,.7,.2,1) ${i * 0.06}s both`,
                cursor: "pointer",
              }}
            >
              <rect x={cx - slot / 2} y={padT - 8} width={slot} height={H - padT - padB + 8} fill={sel === i ? "#1b1714" : "transparent"} opacity={0.05} />
              <line x1={cx} x2={cx} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth={1.4} />
              <rect x={cx - bodyW / 2} y={top} width={bodyW} height={Math.max(2, bottom - top)} fill={up ? "url(#k-up)" : "#f6efe0"} stroke={color} strokeWidth={1.4} rx={1.5} />
              {isHi ? (
                <g transform={`translate(${cx} ${y(c.high) - 13})`}>
                  <rect x="-8" y="-8" width="16" height="16" rx="2" fill="#b02d24" transform="rotate(-6)" />
                  <text textAnchor="middle" dominantBaseline="central" fontSize="11.5" fill="#fbf1df" fontFamily="var(--font-brush)">
                    旺
                  </text>
                </g>
              ) : null}
              <text x={cx} y={H - 15} textAnchor="middle" fontSize="15" fill={sel === i ? "#b02d24" : c.luck === "吉" ? "#8a2219" : "#3f3831"} fontFamily="var(--font-brush)">
                {c.label.replace("时", "")}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 min-h-[24px] text-center text-[13px] text-ink-3">
        {picked ? (
          <span>
            <b className="font-semibold text-ink-2">{picked.label}</b> {picked.range} · 开 {picked.open} 收 {picked.close} · 高 {picked.high} 低 {picked.low}
            {picked.luck ? ` · ${picked.luck === "吉" ? "黄道吉时" : "黑道时辰"}` : ""}
          </span>
        ) : (
          (caption ?? "点按任意一根 K 线查看详情")
        )}
      </figcaption>
    </figure>
  );
}
