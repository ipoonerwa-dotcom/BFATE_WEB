"use client";

import { useEffect, useRef, useState } from "react";
import type { QiantongHandle, TubeState } from "./qiantong3d";

export type { TubeState } from "./qiantong3d";

/* 签筒：优先用 3D（按需加载 three.js）；加载中或设备不支持 WebGL 时显示同一个签筒的静态图。
   state 由页面控制：idle → shaking（摇）→ drawn（落签，动画结束时回调 onLanded）。 */
export function Qiantong({
  state,
  label,
  onLanded,
  onActivate,
  disabled = false,
}: {
  state: TubeState;
  /** 落下那支签上写的字，如「第十签」 */
  label?: string;
  onLanded?: () => void;
  onActivate?: () => void;
  disabled?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const handle = useRef<QiantongHandle | null>(null);
  const latest = useRef({ state, label });
  const landed = useRef(onLanded);
  const [mode, setMode] = useState<"loading" | "3d" | "static">("loading");

  useEffect(() => {
    latest.current = { state, label };
    landed.current = onLanded;
  });

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    import("./qiantong3d")
      .then(({ mountQiantong }) => mountQiantong(el, { onLanded: () => landed.current?.() }))
      .then((h) => {
        if (disposed) {
          h.dispose();
          return;
        }
        handle.current = h;
        h.setState(latest.current.state, { label: latest.current.label, instant: true });
        if (process.env.NODE_ENV !== "production") (window as unknown as { __qiantong?: QiantongHandle }).__qiantong = h;
        setMode("3d");
      })
      .catch(() => {
        if (!disposed) setMode("static");
      });
    return () => {
      disposed = true;
      handle.current?.dispose();
      handle.current = null;
    };
  }, []);

  useEffect(() => {
    if (handle.current) {
      handle.current.setState(state, { label });
      return;
    }
    // 没有 3D（静态图）时，落签直接算「落地」
    if (mode === "static" && state === "drawn") {
      const t = setTimeout(() => landed.current?.(), 500);
      return () => clearTimeout(t);
    }
  }, [state, label, mode]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="摇签"
      aria-disabled={disabled}
      onClick={() => !disabled && onActivate?.()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onActivate?.();
        }
      }}
      className="relative h-[300px] w-full select-none outline-none md:h-[380px]"
    >
      {mode !== "3d" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/art/qt-still.webp"
          alt=""
          draggable={false}
          className={`absolute inset-0 h-full w-full object-contain ${mode === "loading" ? "opacity-90" : ""} ${state === "shaking" ? "qt-shake" : ""}`}
        />
      ) : null}
      <div ref={host} className={`absolute inset-0 transition-opacity duration-700 ${mode === "3d" ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}
