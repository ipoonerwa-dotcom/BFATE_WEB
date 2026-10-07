"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/* 首屏山水：远、中、近三层水墨（程序化绘制的图），层间两道流动的云雾，
   仙鹤飞过、江上一叶扁舟、几点金尘，桌面端随鼠标有视差。 */

function Layer({ name, depth, priority = false }: { name: "far" | "mid" | "near"; depth: number; priority?: boolean }) {
  const ref = useRef<HTMLImageElement>(null);
  // 解码完成再淡入（缓存命中时挂载前就已加载完，也要补上标记）。
  useEffect(() => {
    const img = ref.current;
    if (!img) return;
    let alive = true;
    const show = () => {
      if (alive) img.setAttribute("data-loaded", "");
    };
    const ready = () => void img.decode().catch(() => undefined).then(show);
    if (img.complete && img.naturalWidth) ready();
    else img.addEventListener("load", ready, { once: true });
    return () => {
      alive = false;
      img.removeEventListener("load", ready);
    };
  }, []);
  return (
    <picture className="hero-layer" style={{ "--d": depth } as CSSProperties}>
      <source media="(max-aspect-ratio: 1/1)" type="image/avif" srcSet={`/art/hero-m-${name}.avif`} />
      <source media="(max-aspect-ratio: 1/1)" type="image/webp" srcSet={`/art/hero-m-${name}.webp`} />
      <source type="image/avif" srcSet={`/art/hero-d-${name}.avif`} />
      <img ref={ref} src={`/art/hero-d-${name}.webp`} alt="" decoding="async" fetchPriority={priority ? "high" : "auto"} draggable={false} />
    </picture>
  );
}

/** 丹顶鹤（侧身飞行，头朝左）。翅膀上下扇动靠 scaleY 翻转。 */
export function Crane({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 160 80" className={className} style={style} aria-hidden="true">
      {/* 远侧翅膀 */}
      <g className="crane-wing far" opacity="0.7">
        <path d="M86 37 C 86 22, 96 9, 116 3 C 110 13, 104 25, 98 39 Z" fill="#efe8db" stroke="#2b2622" strokeWidth="0.9" strokeLinejoin="round" />
        <path d="M116 3 C 112 9, 109 14, 107 19 L 112 16 L 110 22 L 115 18 Z" fill="#1d1a17" />
      </g>
      {/* 腿：向后伸直 */}
      <path d="M100 45 L 147 50 M100 46.5 L 145 53.5" stroke="#2b2622" strokeWidth="1.1" strokeLinecap="round" />
      {/* 尾羽 */}
      <path d="M103 39.5 L 121 37 L 116 42.5 L 120 46 L 103 45 Z" fill="#1d1a17" />
      {/* 身体 */}
      <ellipse cx="88" cy="42" rx="20" ry="6.4" transform="rotate(-5 88 42)" fill="#f8f3ea" stroke="#2b2622" strokeWidth="1.1" />
      {/* 颈与头 */}
      <path d="M72 40.5 C 60 38.5, 48 36.5, 36.5 34.5" stroke="#1d1a17" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <circle cx="34" cy="34" r="3.4" fill="#1d1a17" />
      <circle cx="34.2" cy="31.6" r="1.6" fill="#c0392b" />
      <path d="M31 34.6 L 15 37.4" stroke="#6b5a48" strokeWidth="1.5" strokeLinecap="round" />
      {/* 近侧翅膀 */}
      <g className="crane-wing">
        <path d="M84 39 C 82 21, 72 7, 52 1 C 61 14, 66 27, 72 41 Z" fill="#fbf7ef" stroke="#2b2622" strokeWidth="1" strokeLinejoin="round" />
        <path d="M52 1 C 57 8, 61 14, 63 20 L 57 16.5 L 60 23 L 54.5 19.5 Z" fill="#1d1a17" />
        <path d="M70 37 C 68 27, 64 19, 58 12" stroke="#2b2622" strokeWidth="0.6" fill="none" opacity="0.5" />
      </g>
    </svg>
  );
}

/** 一叶扁舟：船篷、蓑笠翁、一根钓竿，船下几道水纹。 */
function Boat() {
  return (
    <div className="hero-boat">
      <svg viewBox="0 0 140 60" className="w-full overflow-visible" aria-hidden="true">
        <g className="boat-bob">
          <path d="M8 36 Q 64 47 128 31 L 123 38 Q 64 52 14 41 Z" fill="#26211c" />
          <path d="M40 35.5 Q 55 18 76 33.5 Z" fill="#3b342c" />
          <path d="M44 34 Q 56 22 72 33" stroke="#1b1714" strokeWidth="0.8" fill="none" opacity="0.6" />
          <path d="M98 32 L 108 32 L 104 20 Z" fill="#2b2520" />
          <path d="M95.5 21.5 L 112.5 21.5 L 104 15 Z" fill="#1b1714" />
          <path d="M106 24 L 134 1" stroke="#2b2520" strokeWidth="0.9" strokeLinecap="round" />
          <path d="M134 1 L 133 38" stroke="#2b2520" strokeWidth="0.35" opacity="0.55" />
        </g>
        <g stroke="#3f3831" strokeLinecap="round" fill="none">
          <path className="ripple" d="M30 50 H 104" strokeWidth="1" />
          <path className="ripple" d="M44 55 H 92" strokeWidth="0.8" style={{ animationDelay: "-1.6s" }} />
          <path className="ripple" d="M54 59 H 82" strokeWidth="0.7" style={{ animationDelay: "-3.2s" }} />
        </g>
      </svg>
    </div>
  );
}

const DUST = [
  [12, 70, 11, 0],
  [22, 58, 14, 3.5],
  [31, 76, 12, 6],
  [38, 64, 16, 1.5],
  [47, 72, 13, 8],
  [55, 60, 15, 4.5],
  [63, 78, 11, 2],
  [70, 66, 14, 9],
  [78, 74, 12, 5.5],
  [86, 62, 16, 0.8],
  [92, 70, 13, 7],
  [17, 82, 15, 10],
  [59, 84, 12, 11.5],
  [82, 84, 14, 3],
] as const;

export function HeroScene({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    const tick = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      el.style.setProperty("--mx", cx.toFixed(4));
      el.style.setProperty("--my", cy.toFixed(4));
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.0005 ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={ref} className="hero relative isolate overflow-hidden">
      <div className="hero-art" aria-hidden="true">
        <div className="hero-sun">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/art/sun.webp" alt="" draggable={false} />
        </div>
        <Layer name="far" depth={0.25} />
        <div className="hero-mist a" />
        <div className="hero-cranes">
          <div className="crane-track c1" style={{ animationDuration: "52s", animationDelay: "-14s" }}>
            <div className="crane-bob">
              <Crane className="w-[56px] md:w-[92px]" />
            </div>
          </div>
          <div className="crane-track c2" style={{ animationDuration: "60s", animationDelay: "-18s" }}>
            <div className="crane-bob" style={{ animationDelay: "-2s" }}>
              <Crane className="ml-[70px] w-[40px] opacity-80 md:ml-[120px] md:w-[62px]" />
            </div>
          </div>
          <div className="crane-track c3" style={{ animationDuration: "74s", animationDelay: "-50s" }}>
            <div className="crane-bob" style={{ animationDelay: "-3.5s" }}>
              <Crane className="w-[30px] opacity-60 md:w-[48px]" />
            </div>
          </div>
        </div>
        <Layer name="mid" depth={0.55} />
        <div className="hero-mist b" />
        <Boat />
        <Layer name="near" depth={1} priority />
        <div className="gold-dust absolute inset-0">
          {DUST.map(([x, y, dur, delay], i) => (
            <i key={i} style={{ left: `${x}%`, top: `${y}%`, animationDuration: `${dur}s`, animationDelay: `${-delay}s` }} />
          ))}
        </div>
      </div>
      <div className="relative z-10">{children}</div>
    </section>
  );
}
