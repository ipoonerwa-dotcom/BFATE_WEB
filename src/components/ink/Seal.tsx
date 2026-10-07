import type { CSSProperties } from "react";

/* 朱砂印章：白文方印（红底留白字）或朱文印（红字红框）。
   边缘用噪声位移做出石刻的毛边，再叠一层印泥遮罩，让印色有深浅、有斑驳。 */
export function Seal({
  text = "知命",
  size = 44,
  rotate = -6,
  className = "",
  animate = false,
  variant = "bai",
  style,
}: {
  text?: string;
  size?: number;
  rotate?: number;
  className?: string;
  animate?: boolean;
  /** bai：白文（红底白字）；zhu：朱文（红字红框） */
  variant?: "bai" | "zhu";
  style?: CSSProperties;
}) {
  const chars = [...text];
  const cols = chars.length <= 2 ? 1 : 2;
  // 方印的字从右往左、从上往下排。
  const columns = cols === 1 ? [chars] : [chars.slice(0, Math.ceil(chars.length / 2)), chars.slice(Math.ceil(chars.length / 2))];
  const seed = [...text].reduce((a, c) => a + c.charCodeAt(0), 0);
  const id = `seal-${seed}-${variant}`;
  const red = "#b3291f";
  const fg = variant === "bai" ? "#f7ecdc" : red;
  return (
    <span
      className={`inline-block ${animate ? "anim-stamp" : ""} ${className}`}
      style={{
        width: size,
        height: size,
        transform: animate ? undefined : `rotate(${rotate}deg)`,
        WebkitMaskImage: "url(/art/seal-grain.webp)",
        maskImage: "url(/art/seal-grain.webp)",
        WebkitMaskSize: `${Math.max(90, size * 2.2)}px`,
        maskSize: `${Math.max(90, size * 2.2)}px`,
        WebkitMaskPosition: `${(seed * 37) % 200}px ${(seed * 53) % 200}px`,
        maskPosition: `${(seed * 37) % 200}px ${(seed * 53) % 200}px`,
        ...style,
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }}>
        <defs>
          <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed={seed % 97} />
            <feDisplacementMap in="SourceGraphic" scale="4" />
          </filter>
        </defs>
        <g filter={`url(#${id})`}>
          {variant === "bai" ? (
            <>
              <rect x="4" y="4" width="92" height="92" rx="5" fill={red} />
              <rect x="11" y="11" width="78" height="78" rx="3" fill="none" stroke={fg} strokeWidth="1.6" opacity="0.55" />
            </>
          ) : (
            <rect x="6" y="6" width="88" height="88" rx="4" fill="none" stroke={red} strokeWidth="6" />
          )}
          {columns.map((col, ci) =>
            col.map((ch, ri) => {
              const colW = 76 / columns.length;
              const x = cols === 1 ? 50 : 88 - colW * ci - colW / 2;
              const rowH = 76 / col.length;
              const y = 12 + rowH * ri + rowH / 2;
              return (
                <text
                  key={`${ci}-${ri}`}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={fg}
                  style={{ fontFamily: "var(--font-brush)", fontSize: cols === 1 ? 76 / col.length - 2 : 34 }}
                >
                  {ch}
                </text>
              );
            }),
          )}
        </g>
      </svg>
    </span>
  );
}
